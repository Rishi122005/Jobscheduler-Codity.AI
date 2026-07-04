import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/auth';
import logger from '../utils/logger';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
  };
}

export const authenticateJWT = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      status: 'error',
      message: 'Authentication token is required. Format: Bearer <token>',
    });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = verifyAccessToken(token);
    
    // Attach the authenticated user to the request object
    (req as AuthenticatedRequest).user = { id: decoded.userId };
    
    next();
  } catch (error) {
    logger.warn(`JWT verification failed: ${(error as Error).message}`);
    res.status(401).json({
      status: 'error',
      message: 'Authentication token is expired or invalid',
    });
  }
};

export default authenticateJWT;
