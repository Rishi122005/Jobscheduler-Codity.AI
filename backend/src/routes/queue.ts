import { Router } from 'express';
import { Role } from '@prisma/client';
import {
  createQueue,
  updateQueue,
  deleteQueue,
  listQueues,
  pauseQueue,
  resumeQueue,
  getQueueStats,
  createQueueSchema,
  updateQueueSchema,
  listQueuesSchema,
} from '../controllers/queue';
import validateRequest from '../middleware/requestValidator';
import authenticateJWT from '../middleware/auth';
import { checkProjectRole, checkQueueRole } from '../middleware/authorize';

const router = Router();

router.use(authenticateJWT);

router.post(
  '/',
  checkProjectRole([Role.OWNER, Role.ADMIN, Role.DEVELOPER]),
  validateRequest(createQueueSchema),
  createQueue
);

router.get(
  '/',
  checkProjectRole([Role.OWNER, Role.ADMIN, Role.DEVELOPER, Role.VIEWER]),
  validateRequest(listQueuesSchema),
  listQueues
);

router.put(
  '/:queueId',
  checkQueueRole([Role.OWNER, Role.ADMIN, Role.DEVELOPER]),
  validateRequest(updateQueueSchema),
  updateQueue
);

router.delete(
  '/:queueId',
  checkQueueRole([Role.OWNER, Role.ADMIN]),
  deleteQueue
);

router.put(
  '/:queueId/pause',
  checkQueueRole([Role.OWNER, Role.ADMIN, Role.DEVELOPER]),
  pauseQueue
);

router.put(
  '/:queueId/resume',
  checkQueueRole([Role.OWNER, Role.ADMIN, Role.DEVELOPER]),
  resumeQueue
);

router.get(
  '/:queueId/stats',
  checkQueueRole([Role.OWNER, Role.ADMIN, Role.DEVELOPER, Role.VIEWER]),
  getQueueStats
);

export default router;
