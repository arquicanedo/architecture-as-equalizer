// Main entry point - Initialize and start the server
import { Router } from "./router";

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

const router = new Router();
router.listen(PORT);
