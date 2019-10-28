import express from 'express';
import multer from 'multer';
import fs from 'fs';
import util from 'util';
import * as fcm from 'firebase-admin';
import { FCMAPPS_COLLECTION } from '../database';
import {
    ERROR_APP_ID,
    ERROR_FCM_CREDENTIAL_INVALID_FILE,
    ERROR_FCM_INIT,
    ERROR_DATABASE
} from '../constants/errors';
import { encodeError } from '../utils/error-encoder';

const upload = multer({ dest: 'uploads/' });
const readFile = util.promisify(fs.readFile);
const unlink = util.promisify(fs.unlink);

export const setFCMToAppId = (db, fcmApps) => async (req, res) => {
    if (!req.params || !req.params.appId) return void res.status(400).json(encodeError(null, ERROR_APP_ID));
    if (!req.file || !req.file.path) return void res.status(400).json(encodeError(null, ERROR_FCM_CREDENTIAL_INVALID_FILE));

    const appId = req.params.appId;
    const filePath = req.file.path;
    let file, credential;

    try {
        file = await readFile(filePath, 'utf8');
        credential = JSON.parse(file);
    }
    catch (error) {
        return void res.status(400).json(encodeError(null, ERROR_FCM_CREDENTIAL_INVALID_FILE));
    }
    finally {
        unlink(filePath).catch((error) => console.error(`File ${filePath} can not be deleted`));
    }

    try {
        await db.collection(FCMAPPS_COLLECTION).replaceOne(
            {appId},
            {appId, credential},
            {upsert: true}
        );
        try {
            fcmApps[appId] = fcm.initializeApp({
                credential: fcm.credential.cert(credential)
            }, appId);
        }
        catch (error) {
            return void res.status(400).json(encodeError(null, ERROR_FCM_INIT.code, ERROR_FCM_INIT.message, {details: error.message}));
        }
        return void res.status(200).json({appId, fcm: true});
    }
    catch (error) {
        return void res.status(400).json(encodeError(null, ERROR_DATABASE.code, ERROR_DATABASE.message, {details: error.message}));
    }
};

export const unsetFCMToAppId = (db, fcmApps) => async (req, res) => {
    if (!req.params || !req.params.appId) return void res.status(400).json(encodeError(null, ERROR_APP_ID));
    const appId = req.params.appId;
    try {
        await db.collection(FCMAPPS_COLLECTION).deleteOne({appId});
        fcmApps[appId] = undefined;
        return void res.status(200).json({appId, fcm: false});
    }
    catch (error) {
        return void res.status(400).json(encodeError(null, ERROR_DATABASE.code, ERROR_DATABASE.message, {details: error.message}));
    }
};

export const statusFCMFromAppId = (db, fcmApps) => async (req, res) => {
    if (!req.params || !req.params.appId) return void res.status(400).json(encodeError(null, ERROR_APP_ID));
    const appId = req.params.appId;
    try {
        const mongoResult = await db.collection(FCMAPPS_COLLECTION).find({appId}).toArray();
        const isFCMInMongo = mongoResult.length > 0;
        const isFCMInMemory = !!fcmApps[appId];
        return void res.status(200).json({appId, fcm: isFCMInMemory, stored: isFCMInMongo});
    }
    catch (error) {
        return void res.status(400).json(encodeError(null, ERROR_DATABASE.code, ERROR_DATABASE.message, {details: error.message}));
    }
};

export default function adminRoute(db, fcmApps) {
    const router = express.Router();

    router.get('/check-health', (req, res) => {
        db.collection('healthchecks')
            .replaceOne({}, { checkAt: new Date() }, {upsert: true})
            .then(() => {
                res.status(204).end();
            }, error => {
                res.status(error.code).json(encodeError(null, ERROR_DATABASE.code, ERROR_DATABASE.message, {details: error.message}));
            });
    });
    router.get('/fcm/:appId', statusFCMFromAppId(db, fcmApps));
    router.post('/fcm/:appId', upload.single('credentials'), setFCMToAppId(db, fcmApps));
    router.delete('/fcm/:appId', unsetFCMToAppId(db, fcmApps));

    return router;
}
