import * as http from 'http';
import { ApiRouter } from './router';

const PORT = process.env.PORT || 3000;

async function bootstrap() {
    const router = new ApiRouter();
    router.init(); // Initialize routes and services

    const server = http.createServer(router.getRequestListener());

    server.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}

bootstrap();
