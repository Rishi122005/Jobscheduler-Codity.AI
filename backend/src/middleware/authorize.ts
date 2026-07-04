import { Response, NextFunction } from 'express';
import prisma from '../utils/db';
import { AuthenticatedRequest } from './auth';
import { Role } from '@prisma/client';

export const checkOrgRole = (allowedRoles: Role[]) => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.id;
      const orgId = req.params.orgId || req.body.organizationId || req.query.orgId as string;

      if (!userId) {
        res.status(401).json({ status: 'error', message: 'Unauthorized: User not authenticated' });
        return;
      }

      if (!orgId) {
        res.status(400).json({ status: 'error', message: 'Organization ID is required' });
        return;
      }

      const member = await prisma.organizationMember.findUnique({
        where: {
          organizationId_userId: {
            organizationId: orgId,
            userId,
          },
        },
      });

      if (!member || !allowedRoles.includes(member.role)) {
        res.status(403).json({
          status: 'error',
          message: 'Forbidden: Insufficient permissions for this organization',
        });
        return;
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

export const checkProjectRole = (allowedRoles: Role[]) => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.id;
      const projectId = req.params.projectId || req.body.projectId || req.query.projectId as string;

      if (!userId) {
        res.status(401).json({ status: 'error', message: 'Unauthorized: User not authenticated' });
        return;
      }

      if (!projectId) {
        res.status(400).json({ status: 'error', message: 'Project ID is required' });
        return;
      }

      const project = await prisma.project.findUnique({
        where: { id: projectId },
        select: { organizationId: true },
      });

      if (!project) {
        res.status(404).json({ status: 'error', message: 'Project not found' });
        return;
      }

      const member = await prisma.organizationMember.findUnique({
        where: {
          organizationId_userId: {
            organizationId: project.organizationId,
            userId,
          },
        },
      });

      if (!member || !allowedRoles.includes(member.role)) {
        res.status(403).json({
          status: 'error',
          message: 'Forbidden: Insufficient permissions for the project organization',
        });
        return;
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

export const checkQueueRole = (allowedRoles: Role[]) => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.id;
      const queueId = req.params.queueId || req.body.queueId || req.query.queueId as string;

      if (!userId) {
        res.status(401).json({ status: 'error', message: 'Unauthorized: User not authenticated' });
        return;
      }

      if (!queueId) {
        res.status(400).json({ status: 'error', message: 'Queue ID is required' });
        return;
      }

      const queue = await prisma.queue.findUnique({
        where: { id: queueId },
        select: {
          project: {
            select: { organizationId: true },
          },
        },
      });

      if (!queue) {
        res.status(404).json({ status: 'error', message: 'Queue not found' });
        return;
      }

      const member = await prisma.organizationMember.findUnique({
        where: {
          organizationId_userId: {
            organizationId: queue.project.organizationId,
            userId,
          },
        },
      });

      if (!member || !allowedRoles.includes(member.role)) {
        res.status(403).json({
          status: 'error',
          message: 'Forbidden: Insufficient permissions for the queue organization',
        });
        return;
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

export const checkJobRole = (allowedRoles: Role[]) => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.id;
      const jobId = req.params.jobId || req.body.jobId || req.query.jobId as string;

      if (!userId) {
        res.status(401).json({ status: 'error', message: 'Unauthorized: User not authenticated' });
        return;
      }

      if (!jobId) {
        res.status(400).json({ status: 'error', message: 'Job ID is required' });
        return;
      }

      const job = await prisma.job.findUnique({
        where: { id: jobId },
        select: {
          project: {
            select: { organizationId: true },
          },
        },
      });

      if (!job) {
        res.status(404).json({ status: 'error', message: 'Job not found' });
        return;
      }

      const member = await prisma.organizationMember.findUnique({
        where: {
          organizationId_userId: {
            organizationId: job.project.organizationId,
            userId,
          },
        },
      });

      if (!member || !allowedRoles.includes(member.role)) {
        res.status(403).json({
          status: 'error',
          message: 'Forbidden: Insufficient permissions for the job organization',
        });
        return;
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

export const checkDLQRole = (allowedRoles: Role[]) => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.id;
      const dlqId = req.params.dlqId || req.body.dlqId || req.query.dlqId as string;

      if (!userId) {
        res.status(401).json({ status: 'error', message: 'Unauthorized: User not authenticated' });
        return;
      }

      if (!dlqId) {
        res.status(400).json({ status: 'error', message: 'DLQ Entry ID is required' });
        return;
      }

      const dlqEntry = await prisma.deadLetterQueue.findUnique({
        where: { id: dlqId },
        select: {
          project: {
            select: { organizationId: true },
          },
        },
      });

      if (!dlqEntry) {
        res.status(404).json({ status: 'error', message: 'DLQ Entry not found' });
        return;
      }

      const member = await prisma.organizationMember.findUnique({
        where: {
          organizationId_userId: {
            organizationId: dlqEntry.project.organizationId,
            userId,
          },
        },
      });

      if (!member || !allowedRoles.includes(member.role)) {
        res.status(403).json({
          status: 'error',
          message: 'Forbidden: Insufficient permissions for the DLQ organization',
        });
        return;
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};
