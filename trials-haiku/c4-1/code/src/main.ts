/**
 * Main entry point - Starts the HTTP server
 */

import { createServer } from 'http';
import { router } from './router';

const PORT = process.env.PORT || 3000;

const server = createServer(router);

server.listen(PORT, () => {
  console.log(`Task Management API server listening on port ${PORT}`);
  console.log(`Ready to accept requests...`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
  });
});
