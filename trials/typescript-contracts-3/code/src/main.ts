// ============================================================
// Main Entry Point — wiring + server start
// ============================================================

import { createServer } from "http";
import { handleRequest } from "./router";
import { notificationService } from "./services/notification-service";

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Wire event-bus subscriptions before the server starts accepting requests
notificationService.wireEvents();

const server = createServer((req, res) => {
  handleRequest(req, res).catch((err) => {
    console.error("Unhandled router error:", err);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Internal server error" }));
  });
});

server.listen(PORT, () => {
  console.log(`Task Management API listening on http://localhost:${PORT}`);
});

export { server };
