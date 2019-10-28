import express from 'express';
import { encodeError } from '../utils/error-encoder';
import {
    ERROR_APP_ID,
    ERROR_USER_ID,
    ERROR_BODY_PARAMS_MISSING,
    ERROR_DATABASE
} from '../constants/errors';

import targetsFactory from '../models/targets';

export const registerDeviceFromAdmin = (targets) => async (req, res) => {
    const appId = req.get('X-App-Id'),
        userId = req.params.userId,
        body = req.body || {};
        const {
            deviceId,
            token: registerToken,
            model,
            platform
        } = body;
    let errors;

    if (!appId) {
        errors = encodeError(errors, ERROR_APP_ID);
    }

    if (!userId) {
        errors = encodeError(errors, ERROR_USER_ID);
    }

    const missingParams = [
        'deviceId',
        'token',
        'model',
        'platform'
    ].filter(param => !body[param]);

    if (missingParams.length > 0) {
        errors = encodeError(errors, ERROR_BODY_PARAMS_MISSING.code, ERROR_BODY_PARAMS_MISSING.message, {params: missingParams});
    }

    if (errors) {
        return void res.status(400).json(errors);
    }

    try {
        const result = await targets.addOrUpdateDevice(
            userId,
            appId,
            deviceId,
            registerToken,
            model,
            platform
        );
        return res.status(204).end();
    }
    catch (error) {
        return void res.status(400).json(encodeError(null, ERROR_DATABASE.code, ERROR_DATABASE.message, {details: error.message}));
    }
};

export const deleteDeviceFromAdmin = (targets) => async (req, res) => {
    const appId = req.get('X-App-Id'),
        userId = req.params.userId,
        body = req.body || {};
        const {
            deviceId
        } = body;
    let errors;

    if (!appId) {
        errors = encodeError(errors, ERROR_APP_ID);
    }

    if (!userId) {
        errors = encodeError(errors, ERROR_USER_ID);
    }

    const missingParams = [
        'deviceId'
    ].filter(param => !body[param]);

    if (missingParams.length > 0) {
        errors = encodeError(errors, ERROR_BODY_PARAMS_MISSING.code, ERROR_BODY_PARAMS_MISSING.message, {params: missingParams});
    }

    if (errors) {
        return void res.status(400).json(errors);
    }

    try {
        await targets.deleteDevice(
            userId,
            appId,
            deviceId
        );
        return res.status(204).end();
    }
    catch (error) {
        return void res.status(400).json(encodeError(null, ERROR_DATABASE.code, ERROR_DATABASE.message, {details: error.message}));
    }
};

export default function registerRoute(targetsCollection) {
    const router = express.Router(),
        targets = targetsFactory(targetsCollection);

    router.post(
        '/device/:userId',
        registerDeviceFromAdmin(targets)
    );

    router.delete(
        '/device/:userId',
        deleteDeviceFromAdmin(targets)
    );

    return router;
}
