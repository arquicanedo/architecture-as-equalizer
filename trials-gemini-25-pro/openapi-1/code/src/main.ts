import * as http from 'http';
import { requestListener } from './router';

const HOST = 'localhost';
const PORT = 8000;

const server = http.createServer(requestListener);

server.listen(PORT, HOST, () => {
  console.log(`Server is running on http://${HOST}:${PORT}`);
});
