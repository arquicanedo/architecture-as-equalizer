import { createServer } from './server.js';

const PORT = Number(process.env.PORT ?? 3000);

const server = createServer();

server.listen(PORT, () => {
  console.log(`🚀  Task Management API listening on http://localhost:${PORT}`);
  console.log(`    Press Ctrl+C to stop.`);
});
