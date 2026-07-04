import { Router } from 'express';
import { listWorkers } from '../controllers/worker';
import authenticateJWT from '../middleware/auth';

const router = Router();

router.use(authenticateJWT);

router.get('/', listWorkers);

export default router;
