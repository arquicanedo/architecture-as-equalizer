import { APIRouter } from './router';

const router = new APIRouter();
const server = router.createServer();

const port = Number(process.env.PORT) || 3000;
server.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('Shutting down');
  server.close(() => process.exit(0));
});
