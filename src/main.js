import App from './app.js';
import { startDatabase } from './database';
import { loadFCM } from './fcm';

function gracefulShutdown(server, dbClient) {
    return async () => {
        try {
            console.log('starting graceful shutdown.');
            await server.close();
            await dbClient.close();
            console.log('graceful shutdown complete.');
            process.exit(0);
        }
        catch (error) {
            console.logr('error while graceful shuttingdown.', error);
            process.exit(1);
        }
    };
}

async function startApp() {
    const {db, client} = await startDatabase();
    const fcm = await loadFCM(db);
    const {server} = await App(db, fcm);

    process.on('SIGTERM', gracefulShutdown(server, client));
    process.on('SIGINT', gracefulShutdown(server, client));
}

startApp().catch(error => {
    console.error('Tribeca Notifier can not run:', error);
    process.exit(1);
});
