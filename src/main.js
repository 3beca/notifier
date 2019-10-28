import App from './app.js';
import { startDatabase } from './database';
import { loadFCM } from './fcm';

async function startApp() {
    const db = await startDatabase();
    const fcm = await loadFCM(db);
    await App(db, fcm);
}

startApp().catch(error => {
    console.error('Tribeca Notifier can not run:', error);
    process.exit(1);
});
