import { Router } from './router';

const router = new Router();
const port = Number(process.env.PORT || '3000');

router.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});

// graceful shutdown
process.on('SIGINT', () => {
  console.log('Shutting down');
  router.close(() => process.exit(0));
});

// export for demo
export default router;
