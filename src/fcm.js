import * as fcm from 'firebase-admin';
import { FCMAPPS_COLLECTION } from './database';

export async function loadFCM(db) {
    const fcmApps = await db.collection(FCMAPPS_COLLECTION).find({}).toArray();
    return fcmApps.reduce((result, fcmApp) => {
        result[fcmApp.appId] = fcm.initializeApp({
            credential: fcm.credential.cert(fcmApp.credential)
        }, fcmApp.appId);
        return result;
    }, {});
}
