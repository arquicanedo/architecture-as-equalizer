import { start } from './router';

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

start(PORT).then(({ server, port }) => {
  console.log(`Server started on port ${port}`);
});
