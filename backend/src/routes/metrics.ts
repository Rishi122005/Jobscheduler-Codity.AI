import { Router } from 'express';
import { Role } from '@prisma/client';
import { getSystemMetrics, getSystemMetricsSchema } from '../controllers/metrics';
import validateRequest from '../middleware/requestValidator';
import authenticateJWT from '../middleware/auth';
import { checkProjectRole } from '../middleware/authorize';

const router = Router();

router.use(authenticateJWT);

router.get(
  '/',
  checkProjectRole([Role.OWNER, Role.ADMIN, Role.DEVELOPER, Role.VIEWER]),
  validateRequest(getSystemMetricsSchema),
  getSystemMetrics
);

export default router;
