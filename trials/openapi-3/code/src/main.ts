import { createServer } from 'http';
import { handleRequest } from './router.js';

// ─── Entry Point ──────────────────────────────────────────────────────────────
// Boots the HTTP server. The notification service is instantiated (and wires
// up its event-bus subscriptions) via the import side-effect in the router.

const PORT = Number(process.env.PORT ?? 3000);
const HOST = process.env.HOST ?? '127.0.0.1';

const server = createServer((req, res) => {
  handleRequest(req, res).catch((err) => {
    console.error('[Server] Unhandled error:', err);
    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Internal server error' }));
    }
  });
});

server.listen(PORT, HOST, () => {
  console.log(`✅  Task Management API running at http://${HOST}:${PORT}`);
  console.log('   Press Ctrl+C to stop.');
});

export { server };
