import { buildServer } from './bootstrap';

const server = buildServer();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
server.listen(PORT, () => {
  console.log(`Task Management API server listening on http://localhost:${PORT}`);
});
