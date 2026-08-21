/**
 * Main entry point: Start the HTTP server
 */

import { createServer } from 'http';
import { handleRequest } from './router';

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

const server = createServer(async (req, res) => {
  // Handle CORS-like preflight
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    res.end();
    return;
  }

  await handleRequest(req, res);
});

server.listen(PORT, () => {
  console.log(`Task Management API listening on port ${PORT}`);
  console.log(`http://localhost:${PORT}`);
});
