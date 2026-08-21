import { Router } from "./router";

const router = new Router();
const PORT = 4000;

async function start() {
  await router.listen(PORT);
  console.log(`Server listening on http://localhost:${PORT}`);
}

start();

// graceful shutdown
process.on("SIGINT", () => {
  router.close();
  process.exit(0);
});
