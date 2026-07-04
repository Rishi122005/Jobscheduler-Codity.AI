import { Router } from 'express';
import { Role } from '@prisma/client';
import {
  createProject,
  editProject,
  deleteProject,
  listProjects,
  createProjectSchema,
  editProjectSchema,
  listProjectsSchema,
} from '../controllers/project';
import validateRequest from '../middleware/requestValidator';
import authenticateJWT from '../middleware/auth';
import { checkOrgRole, checkProjectRole } from '../middleware/authorize';

const router = Router();

router.use(authenticateJWT);

router.post(
  '/',
  checkOrgRole([Role.OWNER, Role.ADMIN]),
  validateRequest(createProjectSchema),
  createProject
);

router.get(
  '/',
  checkOrgRole([Role.OWNER, Role.ADMIN, Role.DEVELOPER, Role.VIEWER]),
  validateRequest(listProjectsSchema),
  listProjects
);

router.put(
  '/:projectId',
  checkProjectRole([Role.OWNER, Role.ADMIN, Role.DEVELOPER]),
  validateRequest(editProjectSchema),
  editProject
);

router.delete(
  '/:projectId',
  checkProjectRole([Role.OWNER, Role.ADMIN]),
  deleteProject
);

export default router;
