import { MongoClient } from 'mongodb';
import config from './config';

export const FCMAPPS_COLLECTION = 'fcmapps';
export const TARGETS_COLLECTION = 'targets';

async function ensureIndexes(db) {
    await db.collection(FCMAPPS_COLLECTION).createIndex(
        {
            appId: 1
        },
        {
            name: 'appId',
            unique: true,
            background: true
        });
}

export async function startDatabase() {
    const client = await MongoClient.connect(config.mongodb.url, { useNewUrlParser: true, useUnifiedTopology: true });
    const db = client.db(config.mongodb.dbname);
    await ensureIndexes(db);
    return {db, client};
}
