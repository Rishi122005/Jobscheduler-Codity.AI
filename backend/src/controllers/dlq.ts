import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import prisma from '../utils/db';
import { JobStatus } from '@prisma/client';

export const listDLQSchema = z.object({
  query: z.object({
    projectId: z.string().uuid('Invalid Project ID'),
    page: z.string().regex(/^\d+$/).transform(Number).default('1'),
    limit: z.string().regex(/^\d+$/).transform(Number).default('10'),
  }),
});

export const listDLQ = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { projectId, page, limit } = req.query as any;
    const skip = (page - 1) * limit;

    const [entries, total] = await prisma.$transaction([
      prisma.deadLetterQueue.findMany({
        where: { projectId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          queue: { select: { name: true } },
        },
      }),
      prisma.deadLetterQueue.count({
        where: { projectId },
      }),
    ]);

    res.status(200).json({
      status: 'success',
      data: {
        entries,
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

export const retryDLQJob = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { dlqId } = req.params;

    const dlqEntry = await prisma.deadLetterQueue.findUnique({
      where: { id: dlqId },
    });

    if (!dlqEntry) {
      res.status(404).json({ status: 'error', message: 'DLQ record not found' });
      return;
    }

    const retriedJob = await prisma.$transaction(async (tx) => {
      // 1. Move job status back to PENDING and reset retry count
      const job = await tx.job.update({
        where: { id: dlqEntry.originalJobId },
        data: {
          status: JobStatus.PENDING,
          currentRetry: 0,
          runAt: new Date(),
        },
      });

      // 2. Delete DLQ entry
      await tx.deadLetterQueue.delete({
        where: { id: dlqId },
      });

      // 3. Create job log entry for retry action
      await tx.jobLog.create({
        data: {
          jobId: job.id,
          message: 'Job re-submitted for execution from the Dead Letter Queue (DLQ) dashboard.',
          level: 'INFO',
        },
      });

      return job;
    });

    res.status(200).json({
      status: 'success',
      message: 'Job moved from DLQ back to pending status successfully.',
      data: {
        job: retriedJob,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const deleteDLQJob = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { dlqId } = req.params;

    const dlqEntry = await prisma.deadLetterQueue.findUnique({
      where: { id: dlqId },
    });

    if (!dlqEntry) {
      res.status(404).json({ status: 'error', message: 'DLQ record not found' });
      return;
    }

    await prisma.$transaction(async (tx) => {
      // Delete original job
      await tx.job.delete({
        where: { id: dlqEntry.originalJobId },
      });
      // Cascade delete deletes DLQ entry, but we can delete it explicitly
      await tx.deadLetterQueue.delete({
        where: { id: dlqId },
      });
    });

    res.status(200).json({
      status: 'success',
      message: 'Failed job removed from DLQ and database permanently.',
    });
  } catch (error) {
    next(error);
  }
};
