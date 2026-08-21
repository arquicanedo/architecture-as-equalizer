/**
 * Main entry point
 * Starts the HTTP server
 */

import { createServer } from "http";
import { router } from "./router.js";

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

const server = createServer(router);

server.listen(PORT, () => {
  console.log(`Task Management API listening on port ${PORT}`);
  console.log(`Server ready at http://localhost:${PORT}`);
});
