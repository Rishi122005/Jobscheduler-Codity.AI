import { Router } from 'express';
import { emitProjectEvent, emitGlobalEvent } from '../utils/websocket';
import logger from '../utils/logger';

const router = Router();

// Internal route for workers to report real-time events to broadcast over WebSockets
router.post('/jobs/events', (req, res) => {
  try {
    const { projectId, jobId, eventName, data } = req.body;

    if (!projectId || !eventName) {
      res.status(400).json({ status: 'error', message: 'projectId and eventName are required' });
      return;
    }

    // Broadcast to the project room
    emitProjectEvent(projectId, eventName, { jobId, ...data });

    res.status(200).json({ status: 'success' });
  } catch (error) {
    logger.error(`Error broadcasting internal job event: ${(error as Error).message}`);
    res.status(500).json({ status: 'error', message: 'Internal Server Error' });
  }
});

// Internal route for workers to report worker telemetry updates
router.post('/workers/telemetry', (req, res) => {
  try {
    const { workerName, data } = req.body;

    // Broadcast globally to dashboards
    emitGlobalEvent('workerTelemetry', { workerName, ...data });

    res.status(200).json({ status: 'success' });
  } catch (error) {
    logger.error(`Error broadcasting internal worker telemetry: ${(error as Error).message}`);
    res.status(500).json({ status: 'error', message: 'Internal Server Error' });
  }
});

export default router;
