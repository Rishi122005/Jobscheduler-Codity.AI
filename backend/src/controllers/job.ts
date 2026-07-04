import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { JobStatus } from '@prisma/client';
import prisma from '../utils/db';
import { AuthenticatedRequest } from '../middleware/auth';

// Validation Schemas
export const createJobSchema = z.object({
  body: z.object({
    queueId: z.string().uuid('Invalid Queue ID'),
    projectId: z.string().uuid('Invalid Project ID'),
    payload: z.any(),
    priority: z.number().int().optional(),
    runAt: z.string().datetime({ precision: 3 }).optional(),
    delaySeconds: z.number().int().nonnegative().optional(),
    cronExpression: z.string().optional(),
    retryPolicyId: z.string().uuid().optional(),
    maxRetries: z.number().int().min(0).optional(),
  }),
});

export const createBatchJobsSchema = z.object({
  body: z.object({
    queueId: z.string().uuid('Invalid Queue ID'),
    projectId: z.string().uuid('Invalid Project ID'),
    jobs: z.array(
      z.object({
        payload: z.any(),
        priority: z.number().int().optional(),
        runAt: z.string().datetime({ precision: 3 }).optional(),
        delaySeconds: z.number().int().nonnegative().optional(),
        cronExpression: z.string().optional(),
        retryPolicyId: z.string().uuid().optional(),
        maxRetries: z.number().int().min(0).optional(),
      })
    ).min(1, 'At least one job is required in the batch'),
  }),
});

export const listJobsSchema = z.object({
  query: z.object({
    projectId: z.string().uuid('Invalid Project ID'),
    queueId: z.string().uuid().optional(),
    status: z.nativeEnum(JobStatus).optional(),
    page: z.string().regex(/^\d+$/).transform(Number).default('1'),
    limit: z.string().regex(/^\d+$/).transform(Number).default('10'),
    sortBy: z.enum(['priority', 'runAt', 'createdAt', 'status']).default('createdAt'),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
  }),
});

// Controllers
export const createJob = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = (req as AuthenticatedRequest).user?.id;
    const {
      queueId,
      projectId,
      payload,
      priority,
      runAt,
      delaySeconds,
      cronExpression,
      retryPolicyId,
      maxRetries,
    } = req.body;

    let targetRunAt = new Date();
    if (runAt) {
      targetRunAt = new Date(runAt);
    } else if (delaySeconds !== undefined) {
      targetRunAt = new Date(Date.now() + delaySeconds * 1000);
    }

    const job = await prisma.job.create({
      data: {
        queueId,
        projectId,
        payload,
        priority: priority ?? 0,
        runAt: targetRunAt,
        cronExpression,
        retryPolicyId,
        maxRetries: maxRetries ?? 3,
        createdById: userId,
      },
    });

    res.status(201).json({
      status: 'success',
      data: {
        job,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const createBatchJobs = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = (req as AuthenticatedRequest).user?.id;
    const { queueId, projectId, jobs } = req.body;

    const createdJobs = await prisma.$transaction(
      jobs.map((jobData: any) => {
        let targetRunAt = new Date();
        if (jobData.runAt) {
          targetRunAt = new Date(jobData.runAt);
        } else if (jobData.delaySeconds !== undefined) {
          targetRunAt = new Date(Date.now() + jobData.delaySeconds * 1000);
        }

        return prisma.job.create({
          data: {
            queueId,
            projectId,
            payload: jobData.payload,
            priority: jobData.priority ?? 0,
            runAt: targetRunAt,
            cronExpression: jobData.cronExpression,
            retryPolicyId: jobData.retryPolicyId,
            maxRetries: jobData.maxRetries ?? 3,
            createdById: userId,
          },
        });
      })
    );

    res.status(201).json({
      status: 'success',
      data: {
        count: createdJobs.length,
        jobs: createdJobs,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const cancelJob = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { jobId } = req.params;

    const job = await prisma.job.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      res.status(404).json({ status: 'error', message: 'Job not found' });
      return;
    }

    if (job.status !== JobStatus.PENDING && job.status !== JobStatus.RETRYING) {
      res.status(400).json({
        status: 'error',
        message: `Cannot cancel job because its current status is ${job.status}`,
      });
      return;
    }

    const updatedJob = await prisma.job.update({
      where: { id: jobId },
      data: { status: JobStatus.CANCELLED },
    });

    res.status(200).json({
      status: 'success',
      message: 'Job cancelled successfully',
      data: {
        job: updatedJob,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const listJobs = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { projectId, queueId, status, page, limit, sortBy, sortOrder } = req.query as any;

    const skip = (page - 1) * limit;

    const where: any = {
      projectId,
    };

    if (queueId) where.queueId = queueId;
    if (status) where.status = status;

    const [jobs, total] = await prisma.$transaction([
      prisma.job.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          [sortBy]: sortOrder,
        },
        include: {
          queue: { select: { name: true } },
        },
      }),
      prisma.job.count({ where }),
    ]);

    res.status(200).json({
      status: 'success',
      data: {
        jobs,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getJobDetails = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { jobId } = req.params;

    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: {
        executions: {
          orderBy: { startedAt: 'desc' },
        },
        logs: {
          orderBy: { timestamp: 'asc' },
        },
        queue: {
          select: { name: true },
        },
        retryPolicy: true,
      },
    });

    if (!job) {
      res.status(404).json({ status: 'error', message: 'Job not found' });
      return;
    }

    res.status(200).json({
      status: 'success',
      data: {
        job,
      },
    });
  } catch (error) {
    next(error);
  }
};

export default { createJob, createBatchJobs, cancelJob, listJobs, getJobDetails };
