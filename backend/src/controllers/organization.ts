import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { Role } from '@prisma/client';
import prisma from '../utils/db';
import { AuthenticatedRequest } from '../middleware/auth';

// Validation Schemas
export const createOrgSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Name must be at least 2 characters long'),
    slug: z.string().min(2, 'Slug must be at least 2 characters').optional(),
  }),
});

export const updateOrgSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Name must be at least 2 characters long').optional(),
    slug: z.string().min(2, 'Slug must be at least 2 characters').optional(),
  }),
});

export const inviteMemberSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address'),
    role: z.nativeEnum(Role),
  }),
});

// Helper: Slugify name
const slugify = (text: string) => {
  return text
    .toString()
    .toLowerCase()
    .replace(/\s+/g, '-') // Replace spaces with -
    .replace(/[^\w\-]+/g, '') // Remove all non-word chars
    .replace(/\-\-+/g, '-') // Replace multiple - with single -
    .replace(/^-+/, '') // Trim - from start
    .replace(/-+$/, ''); // Trim - from end
};

// Controllers
export const createOrganization = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name, slug } = req.body;
    const userId = (req as AuthenticatedRequest).user?.id;

    if (!userId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }

    const orgSlug = slug ? slugify(slug) : slugify(name) + '-' + Math.floor(Math.random() * 1000);

    // Check if slug is unique
    const existingSlug = await prisma.organization.findUnique({
      where: { slug: orgSlug },
    });

    if (existingSlug) {
      res.status(409).json({
        status: 'error',
        message: 'An organization with this slug already exists. Please choose a different slug.',
      });
      return;
    }

    // Transaction to create organization and add creator as OWNER
    const organization = await prisma.$transaction(async (tx) => {
      const org = await tx.organization.create({
        data: {
          name,
          slug: orgSlug,
        },
      });

      await tx.organizationMember.create({
        data: {
          organizationId: org.id,
          userId,
          role: Role.OWNER,
        },
      });

      return org;
    });

    res.status(201).json({
      status: 'success',
      data: {
        organization,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const updateOrganization = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { orgId } = req.params;
    const { name, slug } = req.body;

    const data: any = {};
    if (name) data.name = name;
    if (slug) {
      const orgSlug = slugify(slug);
      const existingSlug = await prisma.organization.findUnique({
        where: { slug: orgSlug },
      });

      if (existingSlug && existingSlug.id !== orgId) {
        res.status(409).json({
          status: 'error',
          message: 'Slug is already in use by another organization',
        });
        return;
      }
      data.slug = orgSlug;
    }

    const organization = await prisma.organization.update({
      where: { id: orgId },
      data,
    });

    res.status(200).json({
      status: 'success',
      data: {
        organization,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const deleteOrganization = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { orgId } = req.params;

    await prisma.organization.delete({
      where: { id: orgId },
    });

    res.status(200).json({
      status: 'success',
      message: 'Organization deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const listOrganizations = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = (req as AuthenticatedRequest).user?.id;

    if (!userId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }

    const memberships = await prisma.organizationMember.findMany({
      where: { userId },
      include: {
        organization: true,
      },
    });

    const organizations = memberships.map((m) => ({
      ...m.organization,
      role: m.role,
    }));

    res.status(200).json({
      status: 'success',
      data: {
        organizations,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const inviteMember = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { orgId } = req.params;
    const { email, role } = req.body;

    const userToInvite = await prisma.user.findUnique({
      where: { email },
    });

    if (!userToInvite) {
      res.status(404).json({
        status: 'error',
        message: 'No registered user found with this email address',
      });
      return;
    }

    // Check if user is already a member
    const existingMember = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: orgId,
          userId: userToInvite.id,
        },
      },
    });

    if (existingMember) {
      // Update role if already member
      const updatedMember = await prisma.organizationMember.update({
        where: { id: existingMember.id },
        data: { role },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      res.status(200).json({
        status: 'success',
        message: 'Member role updated successfully',
        data: {
          member: updatedMember,
        },
      });
      return;
    }

    const newMember = await prisma.organizationMember.create({
      data: {
        organizationId: orgId,
        userId: userToInvite.id,
        role,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    res.status(201).json({
      status: 'success',
      message: 'Member added to organization successfully',
      data: {
        member: newMember,
      },
    });
  } catch (error) {
    next(error);
  }
};
