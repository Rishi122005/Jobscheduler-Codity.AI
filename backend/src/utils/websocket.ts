import { Server as HttpServer } from 'http';
import { Server as SocketServer, Socket } from 'socket.io';
import logger from './logger';

let io: SocketServer | null = null;

export const initSocketServer = (server: HttpServer): SocketServer => {
  io = new SocketServer(server, {
    cors: {
      origin: '*', // Allow all origins for local dev preview
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket: Socket) => {
    logger.info(`WebSocket Client connected: ${socket.id}`);

    // Join a project-specific room to receive updates
    socket.on('joinProject', (projectId: string) => {
      socket.join(projectId);
      logger.info(`WebSocket client ${socket.id} joined project room: ${projectId}`);
    });

    socket.on('leaveProject', (projectId: string) => {
      socket.leave(projectId);
      logger.info(`WebSocket client ${socket.id} left project room: ${projectId}`);
    });

    socket.on('disconnect', () => {
      logger.info(`WebSocket Client disconnected: ${socket.id}`);
    });
  });

  logger.info('WebSocket Server initialized.');
  return io;
};

/**
 * Emit an event to all clients connected to a specific project room.
 */
export const emitProjectEvent = (projectId: string, eventName: string, data: any): void => {
  if (!io) {
    logger.warn(`emitProjectEvent called before socket server initialization. Event: ${eventName}`);
    return;
  }
  
  io.to(projectId).emit(eventName, data);
  logger.debug(`Emitted socket event: ${eventName} to project room: ${projectId}`);
};

/**
 * Emit a global socket event to all connected clients (e.g. worker telemetry).
 */
export const emitGlobalEvent = (eventName: string, data: any): void => {
  if (!io) return;
  io.emit(eventName, data);
};
