import cronParser from 'cron-parser';
import prisma from '../utils/db';
import logger from '../utils/logger';
import { JobStatus, WorkerStatus } from '@prisma/client';

let schedulerIntervalId: NodeJS.Timeout | null = null;
let healthCheckIntervalId: NodeJS.Timeout | null = null;

export const startScheduler = (): void => {
  logger.info('Scheduler Service starting...');

  // 1. Process recurring jobs every second
  schedulerIntervalId = setInterval(async () => {
    try {
      await processRecurringJobs();
    } catch (error) {
      logger.error(`Error in scheduler loop: ${(error as Error).message}`);
    }
  }, 1000);

  // 2. Perform worker health checks every 10 seconds
  healthCheckIntervalId = setInterval(async () => {
    try {
      await checkWorkerHealth();
    } catch (error) {
      logger.error(`Error in worker health check loop: ${(error as Error).message}`);
    }
  }, 10000);

  logger.info('Scheduler Service started successfully.');
};

export const stopScheduler = (): void => {
  if (schedulerIntervalId) {
    clearInterval(schedulerIntervalId);
    schedulerIntervalId = null;
  }
  if (healthCheckIntervalId) {
    clearInterval(healthCheckIntervalId);
    healthCheckIntervalId = null;
  }
  logger.info('Scheduler Service stopped.');
};

/**
 * Find recurring cron templates that are due, spawn concrete jobs,
 * and update the templates' nextRunAt times.
 */
const processRecurringJobs = async (): Promise<void> => {
  const now = new Date();

  // Find cron templates due to execute
  const dueCronJobs = await prisma.job.findMany({
    where: {
      cronExpression: { not: null },
      nextRunAt: { lte: now },
    },
  });

  if (dueCronJobs.length === 0) return;

  logger.info(`Scheduler: found ${dueCronJobs.length} recurring job template(s) due.`);

  for (const template of dueCronJobs) {
    if (!template.cronExpression) continue;

    try {
      // 1. Calculate next execution date
      const interval = cronParser.parse(template.cronExpression);
      const nextRun = interval.next().toDate();

      // 2. Execute database operations in a transaction
      await prisma.$transaction(async (tx) => {
        // Spawn a concrete execution job
        await tx.job.create({
          data: {
            queueId: template.queueId,
            projectId: template.projectId,
            payload: template.payload ?? {},
            priority: template.priority,
            runAt: template.nextRunAt || now, // Set to scheduled time
            retryPolicyId: template.retryPolicyId,
            maxRetries: template.maxRetries,
            createdById: template.createdById,
            cronExpression: null, // Concrete execution jobs don't have cron
            nextRunAt: null,
          },
        });

        // Update cron template with the next run timestamp
        await tx.job.update({
          where: { id: template.id },
          data: {
            nextRunAt: nextRun,
            runAt: now, // Update template runAt timestamp
          },
        });
      });

      logger.info(`Scheduler: Spawned job instance for template ${template.id}. Next run scheduled for ${nextRun.toISOString()}`);
    } catch (err) {
      logger.error(`Scheduler: Failed to process recurring job ${template.id}: ${(err as Error).message}`);
    }
  }
};

/**
 * Scan for offline workers (last seen > 30 seconds ago)
 * Mark them OFFLINE and fail/retry their running job executions
 */
const checkWorkerHealth = async (): Promise<void> => {
  const cutoff = new Date(Date.now() - 30 * 1000);

  // Find workers that are marked ONLINE/BUSY/IDLE but haven't sent a heartbeat within the last 30s
  const zombieWorkers = await prisma.worker.findMany({
    where: {
      status: { not: WorkerStatus.OFFLINE },
      lastSeen: { lt: cutoff },
    },
  });

  if (zombieWorkers.length === 0) return;

  logger.warn(`Scheduler: Health check found ${zombieWorkers.length} offline worker(s).`);

  for (const worker of zombieWorkers) {
    try {
      await prisma.$transaction(async (tx) => {
        // 1. Mark worker as OFFLINE
        await tx.worker.update({
          where: { id: worker.id },
          data: {
            status: WorkerStatus.OFFLINE,
            runningJobsCount: 0,
          },
        });

        // 2. Find running executions claimed by this worker
        const activeExecutions = await tx.jobExecution.findMany({
          where: {
            workerId: worker.id,
            status: { in: ['RUNNING'] }, // Running executions
          },
          include: { job: true },
        });

        for (const exec of activeExecutions) {
          logger.warn(`Scheduler: Worker ${worker.name} went offline. Reclaiming active execution ${exec.id} of job ${exec.jobId}`);

          // Fail the execution record
          await tx.jobExecution.update({
            where: { id: exec.id },
            data: {
              status: 'FAILED',
              finishedAt: new Date(),
              errorMessage: `Worker ${worker.name} went offline (heartbeat timeout).`,
            },
          });

          // Check if we can retry the job
          if (exec.job.currentRetry < exec.job.maxRetries) {
            // Re-schedule the job for immediate retry
            await tx.job.update({
              where: { id: exec.jobId },
              data: {
                status: JobStatus.RETRYING,
                currentRetry: exec.job.currentRetry + 1,
                runAt: new Date(), // Retry immediately (or let worker retry backoff engine handle it)
              },
            });
          } else {
            // Move to FAILED or DLQ
            await tx.job.update({
              where: { id: exec.jobId },
              data: {
                status: JobStatus.FAILED,
              },
            });

            // Write to DLQ
            await tx.deadLetterQueue.create({
              data: {
                originalJobId: exec.jobId,
                queueId: exec.job.queueId,
                projectId: exec.job.projectId,
                payload: exec.job.payload ?? {},
                failureReason: `Worker offline. Max retries exceeded (${exec.job.maxRetries}/${exec.job.maxRetries}).`,
                attempts: exec.job.currentRetry,
              },
            });
          }
        }
      });

      logger.info(`Scheduler: Offline worker ${worker.name} (${worker.id}) cleaned up successfully.`);
    } catch (err) {
      logger.error(`Scheduler: Cleanup failed for worker ${worker.id}: ${(err as Error).message}`);
    }
  }
};
