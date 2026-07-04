import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { RetryPolicyType } from '@prisma/client';
import prisma from '../utils/db';

// Validation Schemas
export const createRetryPolicySchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Name must be at least 2 characters long'),
    type: z.nativeEnum(RetryPolicyType),
    maxRetries: z.number().int().min(0, 'Max retries must be non-negative'),
    baseDelayMs: z.number().int().min(0, 'Base delay must be non-negative'),
  }),
});

// Controllers
export const createRetryPolicy = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name, type, maxRetries, baseDelayMs } = req.body;

    const policy = await prisma.retryPolicy.create({
      data: {
        name,
        type,
        maxRetries,
        baseDelayMs,
      },
    });

    res.status(201).json({
      status: 'success',
      data: {
        policy,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const listRetryPolicies = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const policies = await prisma.retryPolicy.findMany({
      orderBy: { createdAt: 'desc' },
    });

    res.status(200).json({
      status: 'success',
      data: {
        policies,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const deleteRetryPolicy = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { policyId } = req.params;

    await prisma.retryPolicy.delete({
      where: { id: policyId },
    });

    res.status(200).json({
      status: 'success',
      message: 'Retry policy deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

export default { createRetryPolicy, listRetryPolicies, deleteRetryPolicy };
