// ============================================================
// Main entry point — creates and starts the HTTP server.
// ============================================================

import { createServer } from 'http';
import { handleRequest } from './router.js';

const PORT = Number(process.env.PORT ?? 3000);

const server = createServer((req, res) => {
  handleRequest(req, res).catch((err) => {
    console.error('[Server] Unhandled error:', err);
    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
    }
    res.end(JSON.stringify({ error: 'Internal server error' }));
  });
});

server.listen(PORT, () => {
  console.log(`✅ Task Management API listening on http://localhost:${PORT}`);
  console.log('   Press Ctrl+C to stop.\n');
});

server.on('error', (err) => {
  console.error('[Server] Fatal error:', err);
  process.exit(1);
});
