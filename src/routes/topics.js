import express from 'express';
import targetsFactory from '../models/targets';
import { encodeError } from '../utils/error-encoder';
import {
    ERROR_APP_ID,
    ERROR_USER_ID,
    ERROR_BODY_PARAMS_MISSING,
    ERROR_USER_NOT_FOUND,
    ERROR_DATABASE
} from '../constants/errors';

export const getTopicsFromUser = (targets) => async (req, res) => {
    const userId = req.params.userId,
        appId = req.get('X-App-Id');
    let errors;

    if (!appId) {
        errors = encodeError(errors, ERROR_APP_ID);
    }

    if (!userId) {
        errors = encodeError(errors, ERROR_USER_ID);
    }

    if (errors) {
        return void res.status(400).json(errors);
    }

    try {
        const user = await targets.findTopicsByUserId(userId, appId);
        return void res.status(200).json((user && user.topics) || []);
    }
    catch (error) {
        return void res.status(400).json(encodeError(errors, ERROR_DATABASE.code, ERROR_DATABASE.message, {details: error.message}));
    }
};

export const addUser2Topics = (targets) => async (req, res) => {
    // TODO: Check scopes
    const userId = req.params.userId,
        appId = req.get('X-App-Id'),
        topics = req.body.topics;
    let errors;

    if (!appId) {
        errors = encodeError(errors, ERROR_APP_ID);
    }

    if (!userId) {
        errors = encodeError(errors, ERROR_USER_ID);
    }

    if (!topics) {
        errors = encodeError(errors, ERROR_BODY_PARAMS_MISSING.code, ERROR_BODY_PARAMS_MISSING.message, {params: ['topics']});
    }

    if (errors) {
        return void res.status(400).json(errors);
    }

    try {
        const result = await targets.addUser2Topic(
            userId,
            appId,
            topics
        );
        if (result) return void res.status(200).json({topics});
        return void res.status(404).json(
            encodeError(null, ERROR_USER_NOT_FOUND.code, ERROR_USER_NOT_FOUND.message, {details: `${userId} in ${appId} not found`})
        );
    }
    catch (error) {
        return void res.status(400).json(encodeError(null, ERROR_DATABASE.code, ERROR_DATABASE.message, {details: error.message}));
    }
};

export const deleteAllUsersFromTopics = (targets) => async (req, res) => {
    // TODO: Check scopes
    const appId = req.get('X-App-Id'),
        topics = req.body.topics;
    let errors;

    if (!appId) {
        errors = encodeError(errors, ERROR_APP_ID);
    }

    if (!topics) {
        errors = encodeError(errors, ERROR_BODY_PARAMS_MISSING.code, ERROR_BODY_PARAMS_MISSING.message, {params: ['topics']});
    }

    if (errors) {
        return void res.status(400).json(errors);
    }

    try {
        await targets.deleteAllUserFromTopic(
            appId,
            topics
        );
        return void res.status(200).json({topics});
    }
    catch (error) {
        return void res.status(400).json(encodeError(null, ERROR_DATABASE.code, ERROR_DATABASE.message, {details: error.message}));
    }
};

export const deleteUserFromTopics = (targets) => async (req, res) => {
    // TODO: Check scopes
    const userId = req.params.userId,
        appId = req.get('X-App-Id'),
        topics = req.body.topics;
    let errors;

    if (!appId) {
        errors = encodeError(errors, ERROR_APP_ID);
    }

    if (!userId) {
        errors = encodeError(errors, ERROR_USER_ID);
    }

    if (!topics) {
        errors = encodeError(errors, ERROR_BODY_PARAMS_MISSING.code, ERROR_BODY_PARAMS_MISSING.message, {params: ['topics']});
    }

    if (errors) {
        return void res.status(400).json(errors);
    }

    try {
        await targets.deleteUserFromTopic(
            userId,
            appId,
            topics
        );
        return void res.status(200).json({topics});
    }
    catch (error) {
        return void res.status(400).json(encodeError(null, ERROR_DATABASE.code, ERROR_DATABASE.message, {details: error.message}));
    }
};

export default function topicsRoute(targetsCollection) {
    const router = express.Router(),
        targets = targetsFactory(targetsCollection);

    router.get(
        '/:userId',
        getTopicsFromUser(targets)
    );

    router.post(
        '/:userId',
        addUser2Topics(targets)
    );

    router.delete(
        '/',
        deleteAllUsersFromTopics(targets)
    );

    router.delete(
        '/:userId',
        deleteUserFromTopics(targets)
    );

    return router;
}
