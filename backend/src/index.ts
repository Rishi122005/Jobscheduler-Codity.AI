import http from 'http';
import dotenv from 'dotenv';
import app from './app';
import logger from './utils/logger';
import { startScheduler } from './services/scheduler';
import { initSocketServer } from './utils/websocket';

// Load environment variables
dotenv.config();

const port = process.env.PORT || 3001;

const server = http.createServer(app);

// Initialize WebSocket Server
initSocketServer(server);

server.listen(port, () => {
  logger.info(`Server is running on port ${port} in ${process.env.NODE_ENV || 'development'} mode`);
  startScheduler();
});
