import { ApiRouter } from './router';

const port = Number(process.env.PORT || 3000);

async function start() {
  const router = new ApiRouter();
  await router.listen(port);
  console.log(`Task Management API listening on http://localhost:${port}`);
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
