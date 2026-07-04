import { Request, Response, NextFunction } from 'express';
import prisma from '../utils/db';

export const listWorkers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const workers = await prisma.worker.findMany({
      orderBy: { lastSeen: 'desc' },
    });

    res.status(200).json({
      status: 'success',
      data: {
        workers,
      },
    });
  } catch (error) {
    next(error);
  }
};
