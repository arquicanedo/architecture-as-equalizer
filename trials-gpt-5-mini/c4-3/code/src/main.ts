import { APIRouter } from './router';

const router = new APIRouter();
const port = Number(process.env.PORT ?? 3000);
router.listen(port, () => console.log(`Server listening on http://localhost:${port}`));

// Graceful shutdown
process.on('SIGINT', () => process.exit(0));
process.on('SIGTERM', () => process.exit(0));
