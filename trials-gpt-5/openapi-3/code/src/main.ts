import { EventBus } from './event-bus';
import { ApiRouter } from './router';

const PORT = parseInt(process.env.PORT || '3000', 10);

export function startServer(port: number = PORT) {
  const bus = new EventBus();
  const router = new ApiRouter(bus);
  const server = router.createServer(port);
  console.log(`Server listening on http://localhost:${port}`);
  return { server, router, bus };
}

if (require.main === module) {
  startServer();
}
