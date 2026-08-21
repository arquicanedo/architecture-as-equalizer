/**
 * Main entry point
 * Starts the HTTP server
 */

import { createServer } from "http";
import { handleRequest } from "./router";

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

const server = createServer(async (req, res) => {
  // Enable CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(200);
    res.end();
    return;
  }

  await handleRequest(req, res);
});

server.listen(PORT, () => {
  console.log(`Task Management API listening on http://localhost:${PORT}`);
});

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("\nShutting down gracefully...");
  server.close(() => {
    console.log("Server closed");
    process.exit(0);
  });
});
