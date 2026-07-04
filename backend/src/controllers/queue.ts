import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import prisma from '../utils/db';

// Validation Schemas
export const createQueueSchema = z.object({
  body: z.object({
    projectId: z.string().uuid('Invalid Project ID'),
    name: z.string().min(2, 'Name must be at least 2 characters long'),
    description: z.string().optional(),
    concurrencyLimit: z.number().int().min(1, 'Concurrency limit must be at least 1').default(1),
    isPaused: z.boolean().default(false),
  }),
});

export const updateQueueSchema = z.object({
  body: z.object({
    description: z.string().optional(),
    concurrencyLimit: z.number().int().min(1).optional(),
    isPaused: z.boolean().optional(),
  }),
});

export const listQueuesSchema = z.object({
  query: z.object({
    projectId: z.string().uuid('Invalid Project ID'),
  }),
});

// Controllers
export const createQueue = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { projectId, name, description, concurrencyLimit, isPaused } = req.body;

    // Check unique queue name in project
    const existingQueue = await prisma.queue.findFirst({
      where: { projectId, name },
    });

    if (existingQueue) {
      res.status(409).json({
        status: 'error',
        message: 'A queue with this name already exists in this project',
      });
      return;
    }

    const queue = await prisma.queue.create({
      data: {
        projectId,
        name,
        description,
        concurrencyLimit,
        isPaused,
      },
    });

    res.status(201).json({
      status: 'success',
      data: {
        queue,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const updateQueue = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { queueId } = req.params;
    const { description, concurrencyLimit, isPaused } = req.body;

    const queue = await prisma.queue.update({
      where: { id: queueId },
      data: {
        ...(description !== undefined && { description }),
        ...(concurrencyLimit !== undefined && { concurrencyLimit }),
        ...(isPaused !== undefined && { isPaused }),
      },
    });

    res.status(200).json({
      status: 'success',
      data: {
        queue,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const deleteQueue = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { queueId } = req.params;

    await prisma.queue.delete({
      where: { id: queueId },
    });

    res.status(200).json({
      status: 'success',
      message: 'Queue deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const listQueues = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { projectId } = req.query as any;

    const queues = await prisma.queue.findMany({
      where: { projectId },
      orderBy: { name: 'asc' },
    });

    res.status(200).json({
      status: 'success',
      data: {
        queues,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const pauseQueue = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { queueId } = req.params;

    const queue = await prisma.queue.update({
      where: { id: queueId },
      data: { isPaused: true },
    });

    res.status(200).json({
      status: 'success',
      message: 'Queue paused successfully',
      data: { queue },
    });
  } catch (error) {
    next(error);
  }
};

export const resumeQueue = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { queueId } = req.params;

    const queue = await prisma.queue.update({
      where: { id: queueId },
      data: { isPaused: false },
    });

    res.status(200).json({
      status: 'success',
      message: 'Queue resumed successfully',
      data: { queue },
    });
  } catch (error) {
    next(error);
  }
};

export const getQueueStats = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { queueId } = req.params;

    const queue = await prisma.queue.findUnique({
      where: { id: queueId },
    });

    if (!queue) {
      res.status(404).json({ status: 'error', message: 'Queue not found' });
      return;
    }

    const jobCounts = await prisma.job.groupBy({
      by: ['status'],
      where: { queueId },
      _count: {
        id: true,
      },
    });

    // Format stats as a mapping
    const stats: Record<string, number> = {
      PENDING: 0,
      CLAIMED: 0,
      RUNNING: 0,
      COMPLETED: 0,
      FAILED: 0,
      RETRYING: 0,
      CANCELLED: 0,
    };

    jobCounts.forEach((group) => {
      stats[group.status] = group._count.id;
    });

    res.status(200).json({
      status: 'success',
      data: {
        queueId,
        stats,
      },
    });
  } catch (error) {
    next(error);
  }
};
