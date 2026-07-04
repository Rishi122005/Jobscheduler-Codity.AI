import { Router } from 'express';
import { Role } from '@prisma/client';
import {
  createOrganization,
  updateOrganization,
  deleteOrganization,
  listOrganizations,
  inviteMember,
  createOrgSchema,
  updateOrgSchema,
  inviteMemberSchema,
} from '../controllers/organization';
import validateRequest from '../middleware/requestValidator';
import authenticateJWT from '../middleware/auth';
import { checkOrgRole } from '../middleware/authorize';

const router = Router();

// Protect all organization routes
router.use(authenticateJWT);

router.post('/', validateRequest(createOrgSchema), createOrganization);
router.get('/', listOrganizations);

router.put(
  '/:orgId',
  checkOrgRole([Role.OWNER, Role.ADMIN]),
  validateRequest(updateOrgSchema),
  updateOrganization
);

router.delete(
  '/:orgId',
  checkOrgRole([Role.OWNER]),
  deleteOrganization
);

router.post(
  '/:orgId/members',
  checkOrgRole([Role.OWNER, Role.ADMIN]),
  validateRequest(inviteMemberSchema),
  inviteMember
);

export default router;
