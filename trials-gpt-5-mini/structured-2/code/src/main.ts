import http from 'http';
import { Router } from './router';

const router = new Router();

const server = http.createServer(router.handler);

const port = Number(process.env.PORT || 3000);
server.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});

// export server for demo/testing
export { server };
