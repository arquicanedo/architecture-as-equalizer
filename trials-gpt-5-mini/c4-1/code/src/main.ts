import { ApiRouter } from './router.js';

const router = new ApiRouter();
const port = Number(process.env.PORT ?? 3000);

const server = router.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Server listening on http://localhost:${port}`);
});

process.on('SIGINT', () => {
  // eslint-disable-next-line no-console
  console.log('Shutting down...');
  server.close(() => process.exit(0));
});
