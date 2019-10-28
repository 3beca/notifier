/*
{
    _id: 'userId'-'appid',
    userId: "userId",
    appId: "pingit",
    topics: ['juego1', 'juego2', 'juego3'],
    devices:[
        {deviceId: '12345', registerToken: 'tokenfromfcm', model:'Nexus 5', platform: 'android'},
        {deviceId: '12345', registerToken: 'tokenfromfcm', model:'iPhone 5', platform: 'ios'}
    ],
    emails: ['email1', 'email2'],
    sms: ['sms1', 'sms2']
}
*/
export default (targetsCollection) => {
    const findTarget = (userId, appId) => {
        // TODO:
        // Find an entry with userId and appId
        return new Promise(
            (resolve, reject) => {
                targetsCollection.findOne(
                    {_id: `${userId}-${appId}`}
                ).then(
                    (target) => {
                        if (!target) {
                            reject({
                                code: 404,
                                response: {
                                    code: 404,
                                    message: `Target ${userId}-${appId} not found.`
                                }
                            });
                        }
                        else {
                            resolve({
                                code: 200,
                                response: target
                            });
                        }
                    },
                    (err) => reject(err)
                );
            }
        );
    };

    const createTarget = (target, device) => {
        return targetsCollection.insertOne({
            _id: `${target.userId}-${target.appId}`,
            ...target,
            devices: [
                device
            ]
        }).then(
            (operation) => {
                if (operation &&
                    operation.result &&
                    operation.result.ok) {
                    return {
                        code: 200,
                        response: device

                    };
                }
                throw new Error('Failed to create target in mongodb');
            }
        );
    };

    const insertDevice = (userId, appId, deviceId, regToken, model, platform) => {
        // Insert device in target
        return targetsCollection.updateOne(
            { _id: `${userId}-${appId}` },
            {
                $push: {
                    'devices': {
                        deviceId,
                        registerToken: regToken,
                        model,
                        platform
                    }
                }
            }
        ).then(
            (operation) => {
                if (operation && operation.result && operation.result.ok) {
                    return {
                        code: 200,
                        response: {
                            deviceId,
                            registerToken: regToken,
                            model,
                            platform
                        }
                    };
                }
                throw new Error('Failed to insert device in mongodb');
            }
        );
    };

    const updateDevice = (userId, appId, deviceId, index, regToken) => {
        return targetsCollection.updateOne(
            { _id: `${userId}-${appId}` },
            {
                $set: {
                    [`devices.${index}.registerToken`]: regToken
                }
            }
        ).then(
            (operation) => {
                if (operation && operation.result && operation.result.ok) {
                    return {
                        code: 200,
                        response: {
                            deviceId,
                            registerToken: regToken
                        }
                    };
                }
                throw new Error('Failed to update device in mongodb');
            }
        );
    };

    const deleteDevice = (userId, appId, deviceId) => {
        // Insert device in target
        return targetsCollection.updateOne(
            { _id: `${userId}-${appId}` },
            {
                $pull: {
                    'devices': { deviceId }
                }
            }
        ).then(
            (operation) => {
                if (operation && operation.result && operation.result.ok) {
                    return true;
                }
                throw new Error('Failed to delete device in mongodb');
            }
        );
    };

    const addOrUpdateDevice = (userId, appId, deviceId, regToken, model, platform) => {
        // TODO:
        /*
                return targetsCollection.updateOne(
            {
                _id: `${userId}-${appId}`,
                userId,
                appId
            },
            {
                $addtoset: { devices: }
            },
            {
                upsert: true
            }
        );
        */
        // Check if exists user-app entry
        return findTarget(
            userId,
            appId
        ).then(
            ({response: target}) => {
                const devices = target.devices || [];
                const index = devices.findIndex((device) => device.deviceId === deviceId);
                if (index === -1) {
                    // Add entry if not exists
                    return insertDevice(userId, appId, deviceId, regToken, model, platform);
                }
                else {
                    // Update if exists
                    return updateDevice(userId, appId, deviceId, index, regToken);
                }
            },
            (error) => {
                if (error.code === 404) {
                    return createTarget(
                        {
                            userId,
                            appId
                        },
                        {
                            deviceId,
                            registerToken: regToken,
                            model,
                            platform
                        }
                    );
                }
                else {
                    throw new Error(error.message);
                }
            }
        );
    };

    const addUser2Topic = (userId, appId, topics) => {
        const newTopics = Array.isArray(topics) ? topics : [topics];
        return targetsCollection.updateOne(
            { _id: `${userId}-${appId}` },
            {
                $addToSet: {
                    'topics': { $each: newTopics}
                }
            }
        ).then(
            (operation) => {
                if (operation && operation.result && operation.result.ok) {
                    if (operation.result.n === 0) {
                        return false;
                    }
                    return true;
                }
                throw new Error('Failed to insert topics');
            }
        );
    };

    const deleteUserFromTopic = (userId, appId, topics) => {
        const newTopics = Array.isArray(topics) ? topics : [topics];
        return targetsCollection.updateMany(
            { _id: `${userId}-${appId}` },
            {
                $pull: {
                    'topics': { $in: newTopics }
                }
            }
        ).then(
            (operation) => {
                if (operation && operation.result && operation.result.ok) {
                    return true;
                }
                throw new Error('Failed to delete topics in mongodb');
            }
        );
    };

    const deleteAllUserFromTopic = (appId, topics) => {
        const newTopics = Array.isArray(topics) ? topics : [topics];
        return targetsCollection.updateMany(
            { appId },
            {
                $pull: {
                    'topics': { $in: newTopics }
                }
            },
            {
                multi: true
            }
        ).then(
            (operation) => {
                if (operation && operation.result && operation.result.ok) {
                    return true;
                }
                throw new Error('Failed to delete topics in mongodb');
            }
        );
    };

    const findDeviceTokenByDeviceId = (deviceId, appId) => {
        return targetsCollection.findOne(
            {
                appId,
                devices: { $elemMatch: { deviceId: deviceId } }
            },
            {
                projection: {
                    'devices.deviceId': 1,
                    'devices.registerToken': 1
                }
            }
        );
    };

    const findDevicesTokenByUserId = (userId, appId) => {
        return targetsCollection.findOne(
            {
                _id: `${userId}-${appId}`
            },
            {
                projection: {'devices.registerToken': 1}
            }
        );
    };

    const findDevicesTokenByTopic = (topic, appId, excludeUsers = []) => {
        return targetsCollection.find(
            {
                appId: appId,
                topics: topic,
                userId: { $nin: excludeUsers}
            },
            {
                projection: {'devices.registerToken': 1}
            }
        ).toArray();
    };

    const findTopicsByUserId = (userId = '3beca', appId = '3beca') => {
        return targetsCollection.findOne(
            {
                _id: `${userId}-${appId}`
            },
            {
                'topics': 1
            }
        );
    };

    return {
        addOrUpdateDevice,
        deleteDevice,
        addUser2Topic,
        deleteUserFromTopic,
        deleteAllUserFromTopic,
        findDeviceTokenByDeviceId,
        findDevicesTokenByUserId,
        findDevicesTokenByTopic,
        findTopicsByUserId
    };
};
