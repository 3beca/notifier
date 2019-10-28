import express from 'express';
import targetsFactory from '../models/targets';
import { encodeError } from '../utils/error-encoder';
import {
    ERROR_APP_ID,
    ERROR_USER_ID,
    ERROR_DEVICE_ID,
    ERROR_FCM_NOT_FOUND,
    ERROR_DATABASE,
    ERROR_DEVICE_NOT_FOUND,
    ERROR_FCM_SENDING_NOTIFICATION,
    ERROR_USER_NOT_FOUND,
    ERROR_INVALID_TOPIC
} from '../constants/errors';
const parseNotificationBody = (
    {
        priority = 'normal',
        notification: {
            body,
            title,
            icon,
            tag
        } = {},
        data = {}
    },
    defaultTitle = 'Tribeca says',
    defaultMessage = 'You have received a Tribeca notification.'
) => {
    return {
        notification: {
            body: body || defaultMessage,
            title: title || defaultTitle,
            icon: icon || 'icon',
            tag
        },
        data
    };
};

const sendNotification = async (fcmApp, tokens, payload) => {
    const response = await fcmApp.messaging().sendToDevice(tokens, payload);
    return response;
};

export const notify2Device = (targets, fcm) => async (req, res) => {
    const deviceId = req.params.deviceId,
        appId = req.get('X-App-Id'),
        body = req.body || {},
        payload = parseNotificationBody(body),
        fcmApp = fcm[appId];

    let errors;
    if (!appId) {
        errors = encodeError(errors, ERROR_APP_ID);
    }

    if (!deviceId) {
        errors = encodeError(errors, ERROR_DEVICE_ID);
    }

    if (!fcmApp) {
        errors = encodeError(
            errors,
            ERROR_FCM_NOT_FOUND.code,
            ERROR_FCM_NOT_FOUND.message,
            {missing: `fcm client for ${appId} not found`}
        );
    }

    if (errors) {
        return void res.status(400).json(errors);
    }

    try {
        const targetFound = await targets.findDeviceTokenByDeviceId(
            deviceId,
            appId
        );
        if (!targetFound) {
            return void res.status(404).json(encodeError(
                null,
                ERROR_DEVICE_NOT_FOUND.code,
                ERROR_DEVICE_NOT_FOUND.message,
                {details: `deviceId ${deviceId} not found in ${appId}`}
            ));
        }
        const index = targetFound.devices.findIndex((device) => device.deviceId === deviceId);
        const token = targetFound.devices[index].registerToken;

        try {
            const result = await sendNotification(fcmApp, token, payload);
            return void res.status(200).json(result);
        }
        catch (error) {
            return void res.status(400).json(encodeError(
                null,
                ERROR_FCM_SENDING_NOTIFICATION.code,
                ERROR_FCM_SENDING_NOTIFICATION.message,
                {details: error.message}
            ));
        }
    }
    catch (error) {
        return void res.status(400).json(encodeError(null, ERROR_DATABASE.code, ERROR_DATABASE.message, {details: error.message}));
    }
};

export const notify2User = (targets, fcm) => async (req, res) => {
    const userId = req.params.userId,
        appId = req.get('X-App-Id'),
        body = req.body || {},
        payload = parseNotificationBody(body),
        fcmApp = fcm[appId];

    let errors;
    if (!appId) {
        errors = encodeError(errors, ERROR_APP_ID);
    }

    if (!userId) {
        errors = encodeError(errors, ERROR_USER_ID);
    }

    if (!fcmApp) {
        errors = encodeError(
            errors,
            ERROR_FCM_NOT_FOUND.code,
            ERROR_FCM_NOT_FOUND.message,
            {missing: `fcm client for ${appId} not found`}
        );
    }

    if (errors) {
        return void res.status(400).json(errors);
    }

    try {
        const targetFound = await targets.findDevicesTokenByUserId(
            userId,
            appId
        );
        if (!targetFound) {
            return void res.status(404).json(
                encodeError(null, ERROR_USER_NOT_FOUND.code, ERROR_USER_NOT_FOUND.message, {details: `${userId} in ${appId} not found`})
            );
        }
        const tokens = targetFound.devices.map(device => device.registerToken);
        try {
            const result = await sendNotification(fcmApp, tokens, payload);
            return void res.status(200).json(result);
        }
        catch (error) {
            return void res.status(400).json(encodeError(
                null,
                ERROR_FCM_SENDING_NOTIFICATION.code,
                ERROR_FCM_SENDING_NOTIFICATION.message,
                {details: error.message}
            ));
        }

    }
    catch (error) {
        return void res.status(400).json(encodeError(null, ERROR_DATABASE.code, ERROR_DATABASE.message, {details: error.message}));
    }
};

export const notify2Topic = (targets, fcm) => async (req, res) => {
    const topic = req.params.topic,
        appId = req.get('X-App-Id'),
        body = req.body || {},
        payload = parseNotificationBody(body),
        excludeUsers = body.excludeUsers || [],
        fcmApp = fcm[appId];

    let errors;
    if (!appId) {
        errors = encodeError(errors, ERROR_APP_ID);
    }

    if (!topic) {
        errors = encodeError(errors, ERROR_INVALID_TOPIC);
    }

    if (!fcmApp) {
        errors = encodeError(
            errors,
            ERROR_FCM_NOT_FOUND.code,
            ERROR_FCM_NOT_FOUND.message,
            {missing: `fcm client for ${appId} not found`}
        );
    }

    if (errors) {
        return void res.status(400).json(errors);
    }

    try {
        const targetsFound = await targets.findDevicesTokenByTopic(
            topic,
            appId,
            excludeUsers
        );
        const tokens = targetsFound.reduce((acc, current) => [...acc, ...current.devices.map(token => token.registerToken)], []);
        try {
            const result = await sendNotification(fcmApp, tokens, payload);
            return void res.status(200).json(result);
        }
        catch (error) {
            return void res.status(400).json(encodeError(
                null,
                ERROR_FCM_SENDING_NOTIFICATION.code,
                ERROR_FCM_SENDING_NOTIFICATION.message,
                {details: error.message}
            ));
        }
    }
    catch (error) {
        return void res.status(400).json(encodeError(null, ERROR_DATABASE.code, ERROR_DATABASE.message, {details: error.message}));
    }
};

export default function notifyRoute(fcm, targetsCollection) {
    const router = express.Router(),
        targets = targetsFactory(targetsCollection);

    router.post(
        'device/:deviceId',
        notify2Device(targets, fcm)
    );


    router.post(
        '/user/:userId',
        notify2User(targets, fcm)
    );

    router.post(
        '/topic/:topic',
        notify2Topic(targets, fcm)
    );

    return router;
}
