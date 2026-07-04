import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodError } from 'zod';

export const validateRequest = (schema: AnyZodObject) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      // Store the parsed results in req so routes can use validated and typed inputs
      if (schema.shape.body) {
        req.body = parsed.body;
      }
      if (schema.shape.query) {
        req.query = parsed.query;
      }
      if (schema.shape.params) {
        req.params = parsed.params;
      }
      
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          status: 'error',
          message: 'Validation failed',
          errors: error.errors.map((err) => ({
            path: err.path.slice(1).join('.'), // Remove the top level ('body', 'query', 'params')
            message: err.message,
          })),
        });
        return;
      }
      next(error);
    }
  };
};

export default validateRequest;
