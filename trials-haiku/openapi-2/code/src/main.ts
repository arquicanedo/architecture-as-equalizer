/**
 * Task Management API - Main Entry Point
 * Starts the HTTP server
 */

import { createServer } from 'http';
import { handleRequest } from './router';

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

const server = createServer(handleRequest);

server.listen(PORT, () => {
  console.log(`Task Management API server running on http://localhost:${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});
