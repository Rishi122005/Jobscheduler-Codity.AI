import prisma from './utils/db';
import logger from './utils/logger';
import { Job, JobExecution, JobStatus, LogLevel, RetryPolicy } from '@prisma/client';

const BACKEND_API_URL = process.env.BACKEND_API_URL || 'http://localhost:3001';

// Helper to report status updates to backend WebSockets broker
const sendInternalEvent = async (projectId: string, jobId: string, eventName: string, data: any) => {
  try {
    await fetch(`${BACKEND_API_URL}/internal/jobs/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId, jobId, eventName, data }),
    });
  } catch (err) {
    logger.debug(`WebSocket report failed: ${(err as Error).message}`);
  }
};

// Handlers Registry for worker tasks
export type JobLogFn = (message: string, level?: LogLevel) => Promise<void>;
export type JobHandler = (payload: any, log: JobLogFn) => Promise<void>;

const jobHandlers: Record<string, JobHandler> = {
  sendEmail: async (payload, log) => {
    await log(`Initiating email dispatch to: ${payload.to}`, LogLevel.INFO);
    await new Promise((resolve) => setTimeout(resolve, 1500));
    await log(`Subject: ${payload.subject}`, LogLevel.INFO);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    await log(`Email sent successfully to ${payload.to}`, LogLevel.INFO);
  },
  processPayment: async (payload, log) => {
    await log(`Processing payment of $${payload.amount} for user ${payload.userId}`, LogLevel.INFO);
    await new Promise((resolve) => setTimeout(resolve, 2000));
    if (payload.amount > 1000) {
      await log('Transaction amount exceeds threshold, checking fraud rules', LogLevel.WARN);
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    await log(`Payment of $${payload.amount} processed successfully. TxID: pay_${Math.random().toString(36).substr(2, 9)}`, LogLevel.INFO);
  },
  simulateFailure: async (payload, log) => {
    await log('Starting simulation task...', LogLevel.INFO);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    await log('Simulating error: Database connection timeout', LogLevel.ERROR);
    throw new Error('Timeout connecting to microservice: checkout-service');
  },
};

/**
 * Atomic Claiming using PostgreSQL SELECT FOR UPDATE SKIP LOCKED
 */
export const claimAvailableJob = async (workerId: string): Promise<Job & { retryPolicy: RetryPolicy | null } | null> => {
  try {
    const claimed = await prisma.$transaction(async (tx) => {
      const selectedJobs = await tx.$queryRaw<Array<{ id: string }>>`
        SELECT j.id FROM jobs j
        JOIN queues q ON j.queue_id = q.id
        WHERE j.status IN ('PENDING', 'RETRYING')
          AND j.run_at <= NOW()
          AND q.is_paused = FALSE
          AND (
            SELECT COUNT(*) FROM jobs active_j
            WHERE active_j.queue_id = j.queue_id
              AND active_j.status IN ('CLAIMED', 'RUNNING')
          ) < q.concurrency_limit
        ORDER BY j.priority DESC, j.run_at ASC
        LIMIT 1
        FOR UPDATE SKIP LOCKED
      `;

      if (!selectedJobs || selectedJobs.length === 0) {
        return null;
      }

      const jobId = selectedJobs[0].id;

      // Update status to CLAIMED
      return tx.job.update({
        where: { id: jobId },
        data: { status: JobStatus.CLAIMED },
        include: { retryPolicy: true },
      });
    });

    return claimed;
  } catch (error) {
    logger.debug(`Claim transaction skipped: ${(error as Error).message}`);
    return null;
  }
};

/**
 * Execute a claimed job, run its handler, store execution metrics and log details,
 * and execute the retry/DLQ fallback logic on failures.
 */
export const executeJob = async (
  job: Job & { retryPolicy: RetryPolicy | null },
  workerId: string
): Promise<void> => {
  const startTime = Date.now();
  let execution: JobExecution | null = null;

  // 1. Create Job Execution record
  try {
    execution = await prisma.jobExecution.create({
      data: {
        jobId: job.id,
        workerId: workerId,
        status: 'RUNNING',
        startedAt: new Date(),
      },
    });

    // Update Job Status to RUNNING
    await prisma.job.update({
      where: { id: job.id },
      data: { status: JobStatus.RUNNING },
    });

    // Broadcast starting event
    sendInternalEvent(job.projectId, job.id, 'job.started', {
      queueId: job.queueId,
      priority: job.priority,
      attempt: job.currentRetry,
    });
  } catch (err) {
    logger.error(`Failed to initialize job execution record: ${(err as Error).message}`);
    return;
  }

  // Create scoped log writer
  const writeJobLog = async (message: string, level: LogLevel = LogLevel.INFO) => {
    try {
      await prisma.jobLog.create({
        data: {
          jobId: job.id,
          jobExecutionId: execution!.id,
          message,
          level,
          timestamp: new Date(),
        },
      });
    } catch (err) {
      logger.error(`Failed to write job log: ${(err as Error).message}`);
    }
  };

  await writeJobLog(`Job execution claimed by worker ${workerId}. Initializing...`, LogLevel.INFO);

  try {
    // 2. Resolve Payload Handler
    const payload = job.payload as any;
    const taskType = payload?.type as string;

    const handler = jobHandlers[taskType];
    if (!handler) {
      await writeJobLog(`No specific handler registered for task type '${taskType}'. Executing default fallback handler.`, LogLevel.WARN);
      await new Promise((resolve) => setTimeout(resolve, 1000));
      await writeJobLog(`Default task execution complete. Payload: ${JSON.stringify(payload)}`, LogLevel.INFO);
    } else {
      await writeJobLog(`Resolved handler for task '${taskType}'. Commencing execution.`, LogLevel.INFO);
      await handler(payload, writeJobLog);
    }

    // 3. Success Completion
    const duration = Date.now() - startTime;
    await writeJobLog(`Job executed successfully in ${duration}ms.`, LogLevel.INFO);

    await prisma.$transaction([
      prisma.jobExecution.update({
        where: { id: execution.id },
        data: {
          status: 'COMPLETED',
          finishedAt: new Date(),
          durationMs: duration,
        },
      }),
      prisma.job.update({
        where: { id: job.id },
        data: { status: JobStatus.COMPLETED },
      }),
    ]);

    // Broadcast completion event
    sendInternalEvent(job.projectId, job.id, 'job.completed', { durationMs: duration });
    logger.info(`Job ${job.id} completed successfully in ${duration}ms.`);
  } catch (error) {
    // 4. Failure Handler & Retry Engine
    const duration = Date.now() - startTime;
    const err = error as Error;
    await writeJobLog(`Job failed during execution: ${err.message}`, LogLevel.ERROR);
    if (err.stack) {
      await writeJobLog(`Stack trace: ${err.stack}`, LogLevel.ERROR);
    }

    try {
      await prisma.$transaction(async (tx) => {
        // Record execution failure details
        await tx.jobExecution.update({
          where: { id: execution!.id },
          data: {
            status: 'FAILED',
            finishedAt: new Date(),
            durationMs: duration,
            errorMessage: err.message,
            stackTrace: err.stack,
          },
        });

        // Determine if we can retry
        if (job.currentRetry < job.maxRetries) {
          const nextRetry = job.currentRetry + 1;
          const delay = calculateRetryDelay(job.retryPolicy, nextRetry);
          const nextRunAt = new Date(Date.now() + delay);

          // Update job for retry
          await tx.job.update({
            where: { id: job.id },
            data: {
              status: JobStatus.RETRYING,
              currentRetry: nextRetry,
              runAt: nextRunAt,
            },
          });

          // Log retry event in the database
          await tx.jobLog.create({
            data: {
              jobId: job.id,
              jobExecutionId: execution!.id,
              message: `Job rescheduled for retry attempt #${nextRetry} in ${delay}ms (scheduled at ${nextRunAt.toISOString()}).`,
              level: LogLevel.WARN,
            },
          });

          // Broadcast retry event
          sendInternalEvent(job.projectId, job.id, 'job.retrying', {
            attempt: nextRetry,
            delay,
          });

          logger.warn(`Job ${job.id} failed. Scheduled retry #${nextRetry} in ${delay}ms.`);
        } else {
          // Max retries exceeded. Move to Dead Letter Queue (DLQ)
          await tx.job.update({
            where: { id: job.id },
            data: { status: JobStatus.FAILED },
          });

          await tx.deadLetterQueue.create({
            data: {
              originalJobId: job.id,
              queueId: job.queueId,
              projectId: job.projectId,
              payload: job.payload ?? {},
              failureReason: err.message,
              stackTrace: err.stack,
              attempts: job.currentRetry,
            },
          });

          await tx.jobLog.create({
            data: {
              jobId: job.id,
              jobExecutionId: execution!.id,
              message: `Max retries exceeded (${job.currentRetry}/${job.maxRetries}). Moving job to Dead Letter Queue (DLQ).`,
              level: LogLevel.ERROR,
            },
          });

          // Broadcast permanent failure event
          sendInternalEvent(job.projectId, job.id, 'job.failed', {
            reason: err.message,
            attempts: job.currentRetry,
          });

          logger.error(`Job ${job.id} failed permanently. Moved to DLQ.`);
        }
      });
    } catch (dbErr) {
      logger.error(`Database error while handling execution failure: ${(dbErr as Error).message}`);
    }
  }
};

/**
 * Calculates delay based on Retry Policy configuration (Phase 7 / Phase 14)
 */
const calculateRetryDelay = (policy: RetryPolicy | null, attempt: number): number => {
  if (!policy) {
    return 5000;
  }

  const { type, baseDelayMs } = policy;

  switch (type) {
    case 'LINEAR':
      return baseDelayMs * attempt;
    case 'EXPONENTIAL':
      return baseDelayMs * Math.pow(2, attempt - 1);
    case 'FIXED':
    default:
      return baseDelayMs;
  }
};
