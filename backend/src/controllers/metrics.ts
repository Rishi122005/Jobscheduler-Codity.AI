import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import prisma from '../utils/db';
import { JobStatus, WorkerStatus } from '@prisma/client';

export const getSystemMetricsSchema = z.object({
  query: z.object({
    projectId: z.string().uuid('Invalid Project ID'),
  }),
});

export const getSystemMetrics = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { projectId } = req.query as any;

    // 1. Job counts by status
    const jobCounts = await prisma.job.groupBy({
      by: ['status'],
      where: { projectId },
      _count: { id: true },
    });

    const jobs = {
      total: 0,
      PENDING: 0,
      CLAIMED: 0,
      RUNNING: 0,
      COMPLETED: 0,
      FAILED: 0,
      RETRYING: 0,
      CANCELLED: 0,
    };

    jobCounts.forEach((group) => {
      const count = group._count.id;
      jobs[group.status] = count;
      jobs.total += count;
    });

    // 2. Average execution time for completed jobs
    const avgDurationExec = await prisma.jobExecution.aggregate({
      where: {
        job: { projectId },
        status: 'COMPLETED',
      },
      _avg: {
        durationMs: true,
      },
    });

    const averageExecutionTimeMs = avgDurationExec._avg.durationMs || 0;

    // 3. Workers metrics (all workers, since workers are global)
    const workerStats = await prisma.worker.groupBy({
      by: ['status'],
      _count: { id: true },
      _avg: {
        cpuUsage: true,
        memoryUsage: true,
      },
    });

    const workers = {
      total: 0,
      ONLINE: 0,
      OFFLINE: 0,
      BUSY: 0,
      IDLE: 0,
      avgCpu: 0,
      avgMemory: 0,
    };

    let totalCpuSum = 0;
    let totalMemSum = 0;
    let cpuCount = 0;

    workerStats.forEach((group) => {
      const count = group._count.id;
      workers[group.status] = count;
      workers.total += count;

      if (group.status !== WorkerStatus.OFFLINE) {
        totalCpuSum += (group._avg.cpuUsage || 0) * count;
        totalMemSum += (group._avg.memoryUsage || 0) * count;
        cpuCount += count;
      }
    });

    workers.avgCpu = cpuCount > 0 ? parseFloat((totalCpuSum / cpuCount).toFixed(2)) : 0;
    workers.avgMemory = cpuCount > 0 ? parseFloat((totalMemSum / cpuCount).toFixed(2)) : 0;

    // 4. Queues summary
    const queues = await prisma.queue.findMany({
      where: { projectId },
      select: {
        id: true,
        name: true,
        isPaused: true,
        concurrencyLimit: true,
        _count: {
          select: {
            jobs: {
              where: { status: JobStatus.PENDING },
            },
          },
        },
      },
    });

    const queuesSummary = queues.map((q) => ({
      id: q.id,
      name: q.name,
      isPaused: q.isPaused,
      concurrencyLimit: q.concurrencyLimit,
      pendingJobsCount: q._count.jobs,
    }));

    // 5. DLQ count
    const dlqCount = await prisma.deadLetterQueue.count({
      where: { projectId },
    });

    // 6. Success/Failure rates
    const completedCount = jobs.COMPLETED;
    const failedCount = jobs.FAILED + dlqCount; // permanent failures
    const finishedTotal = completedCount + failedCount;

    const successRate = finishedTotal > 0 ? parseFloat(((completedCount / finishedTotal) * 100).toFixed(2)) : 100;
    const failureRate = finishedTotal > 0 ? parseFloat(((failedCount / finishedTotal) * 100).toFixed(2)) : 0;

    res.status(200).json({
      status: 'success',
      data: {
        jobs: {
          ...jobs,
          successRate,
          failureRate,
          averageExecutionTimeMs,
        },
        workers,
        queues: queuesSummary,
        deadLetterQueueCount: dlqCount,
      },
    });
  } catch (error) {
    next(error);
  }
};
