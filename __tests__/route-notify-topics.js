import {
    startDatabase,
    TARGETS_COLLECTION
} from '../src/database';
import config from '../src/config';
import targetsFactory from '../src/models/targets';
import { encodeError } from '../src/utils/error-encoder';
import {
    ERROR_APP_ID,
    ERROR_INVALID_TOPIC,
    ERROR_DATABASE,
    ERROR_FCM_NOT_FOUND,
    ERROR_FCM_SENDING_NOTIFICATION
} from '../src/constants/errors';
import {
    notify2Topic
} from '../src/routes/notify';

const createFakeUser = (userId, appId) => ({
    _id: `${userId}-${appId}`,
    userId,
    appId
});

describe(
    'notify2Topic in notify/user/topic route should',
    () => {
        const res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
            end: jest.fn().mockReturnThis()
        };
        let db, targetCollection, targetModel;
        beforeAll(
            async () => {
                config.mongodb.dbname = 'notifier-test-notify-notify2Topic';
                db = await startDatabase();
                targetCollection = db.collection(TARGETS_COLLECTION);
                targetModel = targetsFactory(targetCollection);
            }
        );
        afterAll(
            async () => {
                await db.close();
            }
        );
        beforeEach(
            async () => {
                await targetCollection.deleteMany();
                jest.clearAllMocks();
            }
        );

        it(
            'retrun APPID Error when no appId found',
            async () => {
                const appId = undefined;
                const topic = 'topicundertest';
                const Headers = {'X-App-Id': appId};
                const fcm = {
                    [appId]: {}
                };
                const req = {
                    params: { topic },
                    get: (header) => Headers[header],
                    body: {}
                };

                await notify2Topic(targetModel, fcm)(req, res);

                expect(res.status).toHaveBeenCalledTimes(1);
                expect(res.status).toHaveBeenCalledWith(400);
                expect(res.json).toHaveBeenCalledTimes(1);
                expect(res.json).toHaveBeenCalledWith(encodeError(ERROR_APP_ID));
            }
        );

        it(
            'retrun INVALID TOPIC Error when no topic found',
            async () => {
                const appId = 'testappid';
                const topic = undefined;
                const Headers = {'X-App-Id': appId};
                const fcm = {
                    [appId]: {}
                };
                const req = {
                    params: { topic },
                    get: (header) => Headers[header],
                    body: {}
                };

                await notify2Topic(targetModel, fcm)(req, res);

                expect(res.status).toHaveBeenCalledTimes(1);
                expect(res.status).toHaveBeenCalledWith(400);
                expect(res.json).toHaveBeenCalledTimes(1);
                expect(res.json).toHaveBeenCalledWith(encodeError(ERROR_INVALID_TOPIC));
            }
        );

        it(
            'return FCM APP Error when no fcmApp found for appId',
            async () => {
                const appId = 'testappid';
                const topic = 'testtopic';
                const Headers = {'X-App-Id': appId};
                const fcm = {
                    [appId]: undefined
                };
                const req = {
                    params: { topic },
                    get: (header) => Headers[header],
                    body: {}
                };

                await notify2Topic(targetModel, fcm)(req, res);

                expect(res.status).toHaveBeenCalledTimes(1);
                expect(res.status).toHaveBeenCalledWith(400);
                expect(res.json).toHaveBeenCalledTimes(1);
                expect(res.json).toHaveBeenCalledWith(
                    encodeError(
                        null,
                        ERROR_FCM_NOT_FOUND.code,
                        ERROR_FCM_NOT_FOUND.message,
                        {missing: `fcm client for ${appId} not found`}
                    )
                );
            }
        );

        it(
            'return DATABASE Error when mongo fails',
            async () => {
                const appId = 'testappid';
                const topic = 'testtopic';
                const Headers = {'X-App-Id': appId};
                const fcm = {
                    [appId]: {}
                };
                const req = {
                    params: { topic },
                    get: (header) => Headers[header],
                    body: {}
                };
                const fakeMongoCollection = { find: () => ({ toArray: jest.fn().mockRejectedValue(new Error('Mongo Error'))}) };
                const fakeTargetModel = targetsFactory(fakeMongoCollection);

                await notify2Topic(fakeTargetModel, fcm)(req, res);

                expect(res.status).toHaveBeenCalledTimes(1);
                expect(res.status).toHaveBeenCalledWith(400);
                expect(res.json).toHaveBeenCalledTimes(1);
                expect(res.json).toHaveBeenCalledWith(encodeError(null, ERROR_DATABASE.code, ERROR_DATABASE.message, {details: 'Mongo Error'}));
            }
        );

        it(
            'return 200 when topic does not found',
            async () => {
                const appId = 'testappid';
                const topic = 'testtopic';
                const Headers = {'X-App-Id': appId};
                const sendToDevice = jest.fn().mockResolvedValue({});
                const fcm = {
                    [appId]: {
                        messaging: () => ({
                            sendToDevice
                        })
                    }
                };
                const req = {
                    params: { topic },
                    get: (header) => Headers[header],
                    body: {}
                };

                await notify2Topic(targetModel, fcm)(req, res);

                expect(sendToDevice).toHaveBeenCalledTimes(1);
                expect(sendToDevice).toHaveBeenCalledWith(
                    [],
                    expect.objectContaining({
                        notification: expect.objectContaining({
                            body: 'You have received a Tribeca notification.',
                            title: 'Tribeca says',
                            icon: 'icon',
                            tag: undefined
                        }),
                        data: {}
                    })
                );

                expect(res.status).toHaveBeenCalledTimes(1);
                expect(res.status).toHaveBeenCalledWith(200);
                expect(res.json).toHaveBeenCalledTimes(1);
                expect(res.json).toHaveBeenCalledWith({});
            }
        );

        it(
            'return 200 when topic found and notification is sent without body',
            async () => {
                const appId = 'testappid';
                const topic = 'testtopic';
                const Headers = {'X-App-Id': appId};
                const sendToDevice = jest.fn().mockResolvedValue({});
                const fcm = {
                    [appId]: {
                        messaging: () => ({
                            sendToDevice
                        })
                    }
                };
                const req = {
                    params: { topic },
                    get: (header) => Headers[header],
                    body: null
                };

                const userId = 'testuserid';
                const foundUser = createFakeUser(userId, appId);
                const deviceToken1 = 'tokendevice1';
                const deviceToken2 = 'tokendevice2';
                const firstDevice = {deviceId: 'deviceid1', registerToken: deviceToken1, model: 'xiaomi', platform: 'android'};
                const secondDevice = {deviceId: 'deviceid2', registerToken: deviceToken2, model: 'xr', platform: 'iphone'};
                foundUser.devices = [firstDevice, secondDevice];
                foundUser.topics = [topic];
                await targetCollection.insertOne(foundUser);

                const userId2 = 'testuserid2';
                const foundUser2 = createFakeUser(userId2, appId);
                const deviceToken21 = 'tokendevice21';
                const deviceToken22 = 'tokendevice22';
                const firstDevice2 = {deviceId: 'deviceid21', registerToken: deviceToken21, model: 'xiaomi', platform: 'android'};
                const secondDevice2 = {deviceId: 'deviceid22', registerToken: deviceToken22, model: 'xr', platform: 'iphone'};
                foundUser2.devices = [firstDevice2, secondDevice2];
                foundUser2.topics = [topic];
                await targetCollection.insertOne(foundUser2);

                await notify2Topic(targetModel, fcm)(req, res);

                expect(sendToDevice).toHaveBeenCalledTimes(1);
                expect(sendToDevice).toHaveBeenCalledWith(
                    [deviceToken1, deviceToken2, deviceToken21, deviceToken22],
                    expect.objectContaining({
                        notification: expect.objectContaining({
                            body: 'You have received a Tribeca notification.',
                            title: 'Tribeca says',
                            icon: 'icon',
                            tag: undefined
                        }),
                        data: {}
                    })
                );
                expect(res.status).toHaveBeenCalledTimes(1);
                expect(res.status).toHaveBeenCalledWith(200);
                expect(res.json).toHaveBeenCalledTimes(1);
                expect(res.json).toHaveBeenCalledWith({});
            }
        );

        it(
            'return 200 when topic found and notification is sent',
            async () => {
                const appId = 'testappid';
                const topic = 'testtopic';
                const Headers = {'X-App-Id': appId};
                const sendToDevice = jest.fn().mockResolvedValue({});
                const fcm = {
                    [appId]: {
                        messaging: () => ({
                            sendToDevice
                        })
                    }
                };
                const req = {
                    params: { topic },
                    get: (header) => Headers[header],
                    body: {}
                };

                const userId = 'testuserid';
                const foundUser = createFakeUser(userId, appId);
                const deviceToken1 = 'tokendevice1';
                const deviceToken2 = 'tokendevice2';
                const firstDevice = {deviceId: 'deviceid1', registerToken: deviceToken1, model: 'xiaomi', platform: 'android'};
                const secondDevice = {deviceId: 'deviceid2', registerToken: deviceToken2, model: 'xr', platform: 'iphone'};
                foundUser.devices = [firstDevice, secondDevice];
                foundUser.topics = [topic];
                await targetCollection.insertOne(foundUser);

                const userId2 = 'testuserid2';
                const foundUser2 = createFakeUser(userId2, appId);
                const deviceToken21 = 'tokendevice21';
                const deviceToken22 = 'tokendevice22';
                const firstDevice2 = {deviceId: 'deviceid21', registerToken: deviceToken21, model: 'xiaomi', platform: 'android'};
                const secondDevice2 = {deviceId: 'deviceid22', registerToken: deviceToken22, model: 'xr', platform: 'iphone'};
                foundUser2.devices = [firstDevice2, secondDevice2];
                foundUser2.topics = [topic];
                await targetCollection.insertOne(foundUser2);

                await notify2Topic(targetModel, fcm)(req, res);

                expect(sendToDevice).toHaveBeenCalledTimes(1);
                expect(sendToDevice).toHaveBeenCalledWith(
                    [deviceToken1, deviceToken2, deviceToken21, deviceToken22],
                    expect.objectContaining({
                        notification: expect.objectContaining({
                            body: 'You have received a Tribeca notification.',
                            title: 'Tribeca says',
                            icon: 'icon',
                            tag: undefined
                        }),
                        data: {}
                    })
                );
                expect(res.status).toHaveBeenCalledTimes(1);
                expect(res.status).toHaveBeenCalledWith(200);
                expect(res.json).toHaveBeenCalledTimes(1);
                expect(res.json).toHaveBeenCalledWith({});
            }
        );

        it(
            'return 200 when topic found and notification is sent excluding one user',
            async () => {
                const appId = 'testappid';
                const topic = 'testtopic';
                const Headers = {'X-App-Id': appId};
                const sendToDevice = jest.fn().mockResolvedValue({});
                const fcm = {
                    [appId]: {
                        messaging: () => ({
                            sendToDevice
                        })
                    }
                };
                const userId = 'testuserid';
                const userId2 = 'testuserid2';
                const req = {
                    params: { topic },
                    get: (header) => Headers[header],
                    body: {
                        excludeUsers: [userId2]
                    }
                };

                const foundUser = createFakeUser(userId, appId);
                const deviceToken1 = 'tokendevice1';
                const deviceToken2 = 'tokendevice2';
                const firstDevice = {deviceId: 'deviceid1', registerToken: deviceToken1, model: 'xiaomi', platform: 'android'};
                const secondDevice = {deviceId: 'deviceid2', registerToken: deviceToken2, model: 'xr', platform: 'iphone'};
                foundUser.devices = [firstDevice, secondDevice];
                foundUser.topics = [topic];
                await targetCollection.insertOne(foundUser);

                const foundUser2 = createFakeUser(userId2, appId);
                const deviceToken21 = 'tokendevice21';
                const deviceToken22 = 'tokendevice22';
                const firstDevice2 = {deviceId: 'deviceid21', registerToken: deviceToken21, model: 'xiaomi', platform: 'android'};
                const secondDevice2 = {deviceId: 'deviceid22', registerToken: deviceToken22, model: 'xr', platform: 'iphone'};
                foundUser2.devices = [firstDevice2, secondDevice2];
                foundUser2.topics = [topic];
                await targetCollection.insertOne(foundUser2);

                await notify2Topic(targetModel, fcm)(req, res);

                expect(sendToDevice).toHaveBeenCalledTimes(1);
                expect(sendToDevice).toHaveBeenCalledWith(
                    [deviceToken1, deviceToken2],
                    expect.objectContaining({
                        notification: expect.objectContaining({
                            body: 'You have received a Tribeca notification.',
                            title: 'Tribeca says',
                            icon: 'icon',
                            tag: undefined
                        }),
                        data: {}
                    })
                );
                expect(res.status).toHaveBeenCalledTimes(1);
                expect(res.status).toHaveBeenCalledWith(200);
                expect(res.json).toHaveBeenCalledTimes(1);
                expect(res.json).toHaveBeenCalledWith({});
            }
        );

        it(
            'return 200 when topic found and notification is sent excluding all users',
            async () => {
                const appId = 'testappid';
                const topic = 'testtopic';
                const Headers = {'X-App-Id': appId};
                const sendToDevice = jest.fn().mockResolvedValue({});
                const fcm = {
                    [appId]: {
                        messaging: () => ({
                            sendToDevice
                        })
                    }
                };
                const userId = 'testuserid';
                const userId2 = 'testuserid2';
                const req = {
                    params: { topic },
                    get: (header) => Headers[header],
                    body: {
                        excludeUsers: [userId, userId2]
                    }
                };

                const foundUser = createFakeUser(userId, appId);
                const deviceToken1 = 'tokendevice1';
                const deviceToken2 = 'tokendevice2';
                const firstDevice = {deviceId: 'deviceid1', registerToken: deviceToken1, model: 'xiaomi', platform: 'android'};
                const secondDevice = {deviceId: 'deviceid2', registerToken: deviceToken2, model: 'xr', platform: 'iphone'};
                foundUser.devices = [firstDevice, secondDevice];
                foundUser.topics = [topic];
                await targetCollection.insertOne(foundUser);

                const foundUser2 = createFakeUser(userId2, appId);
                const deviceToken21 = 'tokendevice21';
                const deviceToken22 = 'tokendevice22';
                const firstDevice2 = {deviceId: 'deviceid21', registerToken: deviceToken21, model: 'xiaomi', platform: 'android'};
                const secondDevice2 = {deviceId: 'deviceid22', registerToken: deviceToken22, model: 'xr', platform: 'iphone'};
                foundUser2.devices = [firstDevice2, secondDevice2];
                foundUser2.topics = [topic];
                await targetCollection.insertOne(foundUser2);

                await notify2Topic(targetModel, fcm)(req, res);

                expect(sendToDevice).toHaveBeenCalledTimes(1);
                expect(sendToDevice).toHaveBeenCalledWith(
                    [],
                    expect.objectContaining({
                        notification: expect.objectContaining({
                            body: 'You have received a Tribeca notification.',
                            title: 'Tribeca says',
                            icon: 'icon',
                            tag: undefined
                        }),
                        data: {}
                    })
                );
                expect(res.status).toHaveBeenCalledTimes(1);
                expect(res.status).toHaveBeenCalledWith(200);
                expect(res.json).toHaveBeenCalledTimes(1);
                expect(res.json).toHaveBeenCalledWith({});
            }
        );

        it(
            'return 200 when topic found and custom notification',
            async () => {
                const appId = 'testappid';
                const topic = 'testtopic';
                const Headers = {'X-App-Id': appId};
                const sendToDevice = jest.fn().mockResolvedValue({});
                const fcm = {
                    [appId]: {
                        messaging: () => ({
                            sendToDevice
                        })
                    }
                };
                const userId = 'testuserid';
                const req = {
                    params: { topic },
                    get: (header) => Headers[header],
                    body: {
                        notification: {
                            title: 'testtitle',
                            body: 'testbody'
                        },
                        data: {
                            anyfield: 'testanyfield'
                        },
                        excludeUsers: []
                    }
                };

                const foundUser = createFakeUser(userId, appId);
                const deviceToken1 = 'tokendevice1';
                const deviceToken2 = 'tokendevice2';
                const firstDevice = {deviceId: 'deviceid1', registerToken: deviceToken1, model: 'xiaomi', platform: 'android'};
                const secondDevice = {deviceId: 'deviceid2', registerToken: deviceToken2, model: 'xr', platform: 'iphone'};
                foundUser.devices = [firstDevice, secondDevice];
                foundUser.topics = [topic];
                await targetCollection.insertOne(foundUser);

                await notify2Topic(targetModel, fcm)(req, res);

                expect(sendToDevice).toHaveBeenCalledTimes(1);
                expect(sendToDevice).toHaveBeenCalledWith(
                    [deviceToken1, deviceToken2],
                    expect.objectContaining({
                        notification: expect.objectContaining({
                            body: 'testbody',
                            title: 'testtitle',
                            icon: 'icon',
                            tag: undefined
                        }),
                        data: { anyfield: 'testanyfield' }
                    })
                );
                expect(res.status).toHaveBeenCalledTimes(1);
                expect(res.status).toHaveBeenCalledWith(200);
                expect(res.json).toHaveBeenCalledTimes(1);
                expect(res.json).toHaveBeenCalledWith({});
            }
        );

        it(
            'return FCM SENT Error when fcmApp fails to send the notification',
            async () => {
                const appId = 'testappid';
                const topic = 'testtopic';
                const userId = 'testuserid';
                const Headers = {'X-App-Id': appId};
                const token = 'tsttokenfromtestuser';
                const sendToDevice = jest.fn().mockRejectedValue(new Error('FCM failed to send notification'));
                const fcm = {
                    [appId]: {
                        messaging: () => ({
                            sendToDevice
                        })
                    }
                };
                const req = {
                    params: { topic },
                    get: (header) => Headers[header],
                    body: {}
                };
                const expectedDevice = {deviceId: 'testdeviceid', registerToken: token, model: 'xiaomi', platform: 'android'};
                const expectedTargetUpdated = createFakeUser(userId, appId);
                expectedTargetUpdated.devices = [expectedDevice];
                expectedTargetUpdated.topics = [topic];
                await targetCollection.insertOne(expectedTargetUpdated);

                await notify2Topic(targetModel, fcm)(req, res);

                expect(sendToDevice).toHaveBeenCalledTimes(1);
                expect(sendToDevice).toHaveBeenCalledWith(
                    [token],
                    expect.objectContaining({
                        notification: expect.objectContaining({
                            body: 'You have received a Tribeca notification.',
                            title: 'Tribeca says',
                            icon: 'icon',
                            tag: undefined
                        }),
                        data: {}
                    })
                );
                expect(res.status).toHaveBeenCalledTimes(1);
                expect(res.status).toHaveBeenCalledWith(400);
                expect(res.json).toHaveBeenCalledTimes(1);
                expect(res.json).toHaveBeenCalledWith(encodeError(
                    null,
                    ERROR_FCM_SENDING_NOTIFICATION.code,
                    ERROR_FCM_SENDING_NOTIFICATION.message,
                    {details: 'FCM failed to send notification'}
                ));
            }
        );
    }
);
