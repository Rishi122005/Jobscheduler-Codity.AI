import os from 'os';
import dotenv from 'dotenv';
import prisma from './utils/db';
import logger from './utils/logger';
import PromisePool from './utils/promisePool';
import { claimAvailableJob, executeJob } from './jobExecutor';
import { WorkerStatus } from '@prisma/client';

// Load environment variables
dotenv.config();

const WORKER_NAME = process.env.WORKER_NAME || `worker-${os.hostname()}-${Math.floor(1000 + Math.random() * 9000)}`;
const CONCURRENCY_LIMIT = parseInt(process.env.CONCURRENCY_LIMIT || '5', 10);
const POLL_INTERVAL_MS = parseInt(process.env.POLL_INTERVAL_MS || '1000', 10);

let workerId: string | null = null;
let running = true;
let heartbeatIntervalId: NodeJS.Timeout | null = null;

// Concurrency Pool
const pool = new PromisePool(CONCURRENCY_LIMIT);

// CPU metrics state
let prevCpuUsage = process.cpuUsage();
let prevCpuTime = Date.now();

/**
 * Returns memory utilization percentage
 */
const getMemoryUsage = (): number => {
  const total = os.totalmem();
  const free = os.freemem();
  return parseFloat(((1 - free / total) * 100).toFixed(2));
};

/**
 * Returns CPU usage of the process since last call
 */
const getCpuUsage = (): number => {
  const currCpuUsage = process.cpuUsage();
  const currCpuTime = Date.now();

  const userMs = (currCpuUsage.user - prevCpuUsage.user) / 1000;
  const systemMs = (currCpuUsage.system - prevCpuUsage.system) / 1000;
  const elapsedMs = currCpuTime - prevCpuTime;

  prevCpuUsage = currCpuUsage;
  prevCpuTime = currCpuTime;

  const numCpus = os.cpus().length || 1;
  const usage = ((userMs + systemMs) / (elapsedMs * numCpus)) * 100;
  return parseFloat(Math.min(100, Math.max(0, usage)).toFixed(2));
};

/**
 * Sends heartbeat details to PostgreSQL (Phase 16)
 */
const sendHeartbeat = async (): Promise<void> => {
  if (!workerId) return;

  try {
    const cpu = getCpuUsage();
    const memory = getMemoryUsage();
    const activeJobs = pool.active;
    const status = activeJobs > 0 ? WorkerStatus.BUSY : WorkerStatus.IDLE;

    await prisma.worker.update({
      where: { id: workerId },
      data: {
        lastSeen: new Date(),
        cpuUsage: cpu,
        memoryUsage: memory,
        runningJobsCount: activeJobs,
        status,
      },
    });

    // Report telemetry details over HTTP webhook to trigger live WebSocket broadcast
    const BACKEND_API_URL = process.env.BACKEND_API_URL || 'http://localhost:3001';
    fetch(`${BACKEND_API_URL}/internal/workers/telemetry`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        workerName: WORKER_NAME,
        data: {
          id: workerId,
          cpuUsage: cpu,
          memoryUsage: memory,
          runningJobsCount: activeJobs,
          status,
          lastSeen: new Date(),
        },
      }),
    }).catch(() => {});

    logger.debug(`Heartbeat sent. Status: ${status}, CPU: ${cpu}%, Memory: ${memory}%, Jobs: ${activeJobs}`);
  } catch (err) {
    logger.error(`Failed to send heartbeat: ${(err as Error).message}`);
  }
};

/**
 * Register the worker record in database on startup
 */
const registerWorker = async (): Promise<string> => {
  logger.info(`Registering worker: ${WORKER_NAME}`);
  
  const cpu = getCpuUsage();
  const memory = getMemoryUsage();

  const worker = await prisma.worker.create({
    data: {
      name: WORKER_NAME,
      status: WorkerStatus.ONLINE,
      cpuUsage: cpu,
      memoryUsage: memory,
      runningJobsCount: 0,
      lastSeen: new Date(),
    },
  });

  logger.info(`Worker registered successfully. ID: ${worker.id}`);
  return worker.id;
};

/**
 * Main execution loops
 */
const runPollingLoop = async (): Promise<void> => {
  logger.info(`Worker execution loop started. Local concurrency limit: ${CONCURRENCY_LIMIT}`);

  while (running) {
    if (pool.isFull) {
      // Local concurrency limit hit, wait before checking again
      await new Promise((resolve) => setTimeout(resolve, 200));
      continue;
    }

    try {
      if (!workerId) continue;

      // Claim a job atomically
      const job = await claimAvailableJob(workerId);

      if (!job) {
        // No jobs available, sleep before checking database again
        await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
        continue;
      }

      logger.info(`Worker claimed job: ${job.id} (Queue: ${job.queueId}, Priority: ${job.priority})`);

      // Run job execution in the concurrency pool
      pool.run(async () => {
        try {
          await executeJob(job, workerId!);
        } catch (err) {
          logger.error(`Fatal error in job executor pipeline: ${(err as Error).message}`);
        } finally {
          // Immediately update worker database count after job finishes
          await sendHeartbeat();
        }
      });

      // Update worker heartbeat database details immediately after claiming
      await sendHeartbeat();

    } catch (err) {
      logger.error(`Error in polling loop: ${(err as Error).message}`);
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS * 2));
    }
  }
};

/**
 * Graceful Shutdown (Phase 10 / Phase 30)
 */
const gracefulShutdown = async (signal: string): Promise<void> => {
  logger.warn(`Shutdown signal received (${signal}). Commencing graceful worker shutdown...`);
  running = false; // Stop claiming new jobs

  if (heartbeatIntervalId) {
    clearInterval(heartbeatIntervalId);
  }

  // Wait for currently running jobs to complete
  if (pool.active > 0) {
    logger.info(`Waiting for ${pool.active} active job(s) to complete...`);
    while (pool.active > 0) {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  // Deregister/mark worker offline in the database
  if (workerId) {
    try {
      await prisma.worker.update({
        where: { id: workerId },
        data: {
          status: WorkerStatus.OFFLINE,
          runningJobsCount: 0,
          lastSeen: new Date(),
        },
      });
      logger.info('Worker status marked OFFLINE.');
    } catch (err) {
      logger.error(`Failed to update worker status to OFFLINE: ${(err as Error).message}`);
    }
  }

  await prisma.$disconnect();
  logger.info('Worker process shut down cleanly.');
  process.exit(0);
};

// Start Worker
const start = async () => {
  try {
    workerId = await registerWorker();

    // Start heartbeat loop (every 10 seconds)
    heartbeatIntervalId = setInterval(sendHeartbeat, 10000);

    // Capture shutdown hooks
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Start Polling Loop
    await runPollingLoop();
  } catch (err) {
    logger.error(`Fatal error starting worker: ${(err as Error).message}`);
    process.exit(1);
  }
};

start();
