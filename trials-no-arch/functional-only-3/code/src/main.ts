import { startServer } from "./server.js";

const PORT = parseInt(process.env["PORT"] ?? "3000", 10);

startServer(PORT).catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
