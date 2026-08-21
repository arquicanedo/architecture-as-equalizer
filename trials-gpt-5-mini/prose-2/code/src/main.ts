import { ApiServer } from './router';

const server = new ApiServer();
const srv = server.createServer(3000);
console.log('Server started on http://localhost:3000');

// Graceful
process.on('SIGINT', () => {
  console.log('Shutting down');
  srv.close(() => process.exit(0));
});
