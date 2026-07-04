import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import prisma from '../utils/db';

// Validation Schemas
export const createProjectSchema = z.object({
  body: z.object({
    organizationId: z.string().uuid('Invalid Organization ID'),
    name: z.string().min(2, 'Name must be at least 2 characters long'),
    description: z.string().optional(),
  }),
});

export const editProjectSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Name must be at least 2 characters long').optional(),
    description: z.string().optional(),
  }),
});

export const listProjectsSchema = z.object({
  query: z.object({
    orgId: z.string().uuid('Invalid Organization ID'),
    page: z.string().regex(/^\d+$/).transform(Number).default('1'),
    limit: z.string().regex(/^\d+$/).transform(Number).default('10'),
    search: z.string().optional(),
    sortBy: z.enum(['name', 'createdAt']).default('createdAt'),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
  }),
});

// Controllers
export const createProject = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { organizationId, name, description } = req.body;

    const project = await prisma.project.create({
      data: {
        organizationId,
        name,
        description,
      },
    });

    res.status(201).json({
      status: 'success',
      data: {
        project,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const editProject = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { projectId } = req.params;
    const { name, description } = req.body;

    const project = await prisma.project.update({
      where: { id: projectId },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
      },
    });

    res.status(200).json({
      status: 'success',
      data: {
        project,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const deleteProject = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { projectId } = req.params;

    await prisma.project.delete({
      where: { id: projectId },
    });

    res.status(200).json({
      status: 'success',
      message: 'Project deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const listProjects = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { orgId, page, limit, search, sortBy, sortOrder } = req.query as any;

    const skip = (page - 1) * limit;

    const where: any = {
      organizationId: orgId,
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [projects, total] = await prisma.$transaction([
      prisma.project.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          [sortBy]: sortOrder,
        },
      }),
      prisma.project.count({ where }),
    ]);

    res.status(200).json({
      status: 'success',
      data: {
        projects,
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
export default { createProject, editProject, deleteProject, listProjects };
