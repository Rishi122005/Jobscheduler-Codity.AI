import { Router } from 'express';
import { Role } from '@prisma/client';
import {
  listDLQ,
  retryDLQJob,
  deleteDLQJob,
  listDLQSchema,
} from '../controllers/dlq';
import validateRequest from '../middleware/requestValidator';
import authenticateJWT from '../middleware/auth';
import { checkProjectRole, checkDLQRole } from '../middleware/authorize';

const router = Router();

router.use(authenticateJWT);

router.get(
  '/',
  checkProjectRole([Role.OWNER, Role.ADMIN, Role.DEVELOPER, Role.VIEWER]),
  validateRequest(listDLQSchema),
  listDLQ
);

router.post(
  '/:dlqId/retry',
  checkDLQRole([Role.OWNER, Role.ADMIN, Role.DEVELOPER]),
  retryDLQJob
);

router.delete(
  '/:dlqId',
  checkDLQRole([Role.OWNER, Role.ADMIN]),
  deleteDLQJob
);

export default router;
