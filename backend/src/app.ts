import express from 'express';
import cors from 'cors';
import authRouter from './routes/auth';
import organizationRouter from './routes/organization';
import projectRouter from './routes/project';
import queueRouter from './routes/queue';
import retryPolicyRouter from './routes/retryPolicy';
import jobRouter from './routes/job';
import metricsRouter from './routes/metrics';
import dlqRouter from './routes/dlq';
import workerRouter from './routes/worker';
import internalRouter from './routes/internal';
import errorHandler from './middleware/errorHandler';
import logger from './utils/logger';

const app = express();

// Logging Middleware
app.use((req, _res, next) => {
  logger.http(`${req.method} ${req.originalUrl} - IP: ${req.ip}`);
  next();
});

app.use(cors());
app.use(express.json());

// Routes
app.use('/auth', authRouter);
app.use('/organizations', organizationRouter);
app.use('/projects', projectRouter);
app.use('/queues', queueRouter);
app.use('/retry-policies', retryPolicyRouter);
app.use('/jobs', jobRouter);
app.use('/metrics', metricsRouter);
app.use('/dlq', dlqRouter);
app.use('/workers', workerRouter);
app.use('/internal', internalRouter);

// Health Check
app.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

// Root route
app.get('/', (_req, res) => {
  res.json({
    message: 'Distributed Job Scheduler API Service is running',
  });
});

// 404 Route handler
app.use((req, res) => {
  res.status(404).json({
    status: 'error',
    message: `Route ${req.method} ${req.originalUrl} not found`,
  });
});

// Global Error Handler
app.use(errorHandler);

export default app;
