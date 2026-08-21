import http from "http";
import { router } from "./router";

const PORT = process.env.PORT || 3000;

const server = http.createServer(async (req, res) => {
  try {
    await router(req, res);
  } catch (error) {
    console.error("Unhandled error in server:", error);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Internal Server Error" }));
  }
});

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("\nShutting down server...");
  server.close(() => {
    console.log("Server shut down.");
    process.exit(0);
  });
});
