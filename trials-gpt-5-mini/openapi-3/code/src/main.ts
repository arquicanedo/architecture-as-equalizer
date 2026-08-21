import { createServer } from './router';

const server = createServer();
const port = process.env.PORT ? parseInt(process.env.PORT) : 3000;
server.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});
