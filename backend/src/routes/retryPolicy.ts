import { Router } from 'express';
import {
  createRetryPolicy,
  listRetryPolicies,
  deleteRetryPolicy,
  createRetryPolicySchema,
} from '../controllers/retryPolicy';
import validateRequest from '../middleware/requestValidator';
import authenticateJWT from '../middleware/auth';

const router = Router();

// Protect all retry policy routes
router.use(authenticateJWT);

router.post('/', validateRequest(createRetryPolicySchema), createRetryPolicy);
router.get('/', listRetryPolicies);
router.delete('/:policyId', deleteRetryPolicy);

export default router;
