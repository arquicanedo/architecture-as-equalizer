/**
 * Main entry point — creates the HTTP server and starts listening.
 * Run with: npx tsx src/main.ts
 */

import { createServer } from "http";
import { handleRequest } from "./router.js";

const PORT = Number(process.env.PORT ?? 3000);
const HOST = process.env.HOST ?? "127.0.0.1";

const server = createServer((req, res) => {
  handleRequest(req, res).catch((err) => {
    console.error("[Server] Unexpected error:", err);
    if (!res.headersSent) {
      res.writeHead(500, { "Content-Type": "application/json" });
    }
    res.end(JSON.stringify({ error: "Internal server error" }));
  });
});

server.listen(PORT, HOST, () => {
  console.log(`\n🚀  Task Management API is running`);
  console.log(`   Listening on http://${HOST}:${PORT}`);
  console.log(`   Press Ctrl+C to stop\n`);
});

export { server };
