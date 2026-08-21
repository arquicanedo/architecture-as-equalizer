import { ApiRouter } from './router';

const port = parseInt(process.env.PORT || '3000', 10);
const router = new ApiRouter();
router.listen(port);

console.log(`Task Management API listening on http://localhost:${port}`);
