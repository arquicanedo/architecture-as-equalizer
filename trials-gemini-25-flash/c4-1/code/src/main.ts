import * as http from 'http';
import { handleRequest } from './router';
import { notificationService } from './services/notification-service'; // Import to ensure subscriptions are set up

const PORT = process.env.PORT || 3000;

const server = http.createServer(async (req, res) => {
    // Ensuring notificationService is initialized and its event listeners are set up
    // by simply referencing it. The constructor handles the setup.
    // This is important because Node.js module caching means it's only constructed once.
    // Explicitly doing this to make sure subscriptions are live when server starts.
    notificationService; 

    await handleRequest(req, res);
});

server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
