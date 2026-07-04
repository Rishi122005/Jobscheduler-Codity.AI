import { Router } from 'express';
import {
  register,
  login,
  me,
  refresh,
  logout,
  registerSchema,
  loginSchema,
  refreshSchema,
} from '../controllers/auth';
import validateRequest from '../middleware/requestValidator';
import authenticateJWT from '../middleware/auth';

const router = Router();

router.post('/register', validateRequest(registerSchema), register);
router.post('/login', validateRequest(loginSchema), login);
router.post('/refresh', validateRequest(refreshSchema), refresh);
router.post('/logout', logout);
router.get('/me', authenticateJWT, me);

export default router;
