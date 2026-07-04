import { Router } from 'express';
import { Role } from '@prisma/client';
import {
  createJob,
  createBatchJobs,
  cancelJob,
  listJobs,
  getJobDetails,
  createJobSchema,
  createBatchJobsSchema,
  listJobsSchema,
} from '../controllers/job';
import validateRequest from '../middleware/requestValidator';
import authenticateJWT from '../middleware/auth';
import { checkProjectRole, checkJobRole } from '../middleware/authorize';

const router = Router();

router.use(authenticateJWT);

router.post(
  '/',
  checkProjectRole([Role.OWNER, Role.ADMIN, Role.DEVELOPER]),
  validateRequest(createJobSchema),
  createJob
);

router.post(
  '/batch',
  checkProjectRole([Role.OWNER, Role.ADMIN, Role.DEVELOPER]),
  validateRequest(createBatchJobsSchema),
  createBatchJobs
);

router.get(
  '/',
  checkProjectRole([Role.OWNER, Role.ADMIN, Role.DEVELOPER, Role.VIEWER]),
  validateRequest(listJobsSchema),
  listJobs
);

router.get(
  '/:jobId',
  checkJobRole([Role.OWNER, Role.ADMIN, Role.DEVELOPER, Role.VIEWER]),
  getJobDetails
);

router.put(
  '/:jobId/cancel',
  checkJobRole([Role.OWNER, Role.ADMIN, Role.DEVELOPER]),
  cancelJob
);

export default router;
