import {
    startDatabase,
    TARGETS_COLLECTION
} from '../src/database';
import config from '../src/config';
import targetsFactory from '../src/models/targets';
import {
    notify2User
} from '../src/routes/notify';
import { encodeError } from '../src/utils/error-encoder';
import {
    ERROR_APP_ID,
    ERROR_USER_ID,
    ERROR_DATABASE,
    ERROR_FCM_NOT_FOUND,
    ERROR_USER_NOT_FOUND,
    ERROR_FCM_SENDING_NOTIFICATION
} from '../src/constants/errors';

const createFakeUser = (userId, appId) => ({
    _id: `${userId}-${appId}`,
    userId,
    appId
});

describe(
    'notify2User in notify/user/userId route should',
    () => {
        const res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
            end: jest.fn().mockReturnThis()
        };
        let db, targetCollection, targetModel;
        beforeAll(
            async () => {
                config.mongodb.dbname = 'notifier-test-notify-notify2User';
                db = await startDatabase();
                targetCollection = db.collection(TARGETS_COLLECTION);
                targetModel = targetsFactory(targetCollection);
            }
        );
        afterAll(
            async () => {
                db.close();
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
                const userId = 'testuserid';
                const Headers = {'X-App-Id': appId};
                const fcm = {
                    [appId]: {}
                };
                const req = {
                    params: { userId },
                    get: (header) => Headers[header],
                    body: {}
                };

                await notify2User(targetModel, fcm)(req, res);

                expect(res.status).toHaveBeenCalledTimes(1);
                expect(res.status).toHaveBeenCalledWith(400);
                expect(res.json).toHaveBeenCalledTimes(1);
                expect(res.json).toHaveBeenCalledWith(encodeError(ERROR_APP_ID));
            }
        );

        it(
            'retrun USER ID Error when no userId found',
            async () => {
                const appId = 'testappid';
                const userId = undefined;
                const Headers = {'X-App-Id': appId};
                const fcm = {
                    [appId]: {}
                };
                const req = {
                    params: { userId },
                    get: (header) => Headers[header],
                    body: {}
                };

                await notify2User(targetModel, fcm)(req, res);

                expect(res.status).toHaveBeenCalledTimes(1);
                expect(res.status).toHaveBeenCalledWith(400);
                expect(res.json).toHaveBeenCalledTimes(1);
                expect(res.json).toHaveBeenCalledWith(encodeError(ERROR_USER_ID));
            }
        );

        it(
            'return FCM APP Error when no fcmApp found for appId',
            async () => {
                const appId = 'testappid';
                const userId = 'testuserid';
                const Headers = {'X-App-Id': appId};
                const fcm = {
                    [appId]: undefined
                };
                const req = {
                    params: { userId },
                    get: (header) => Headers[header],
                    body: {}
                };

                await notify2User(targetModel, fcm)(req, res);

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
            'retrun DATABASE Error when mongo fails',
            async () => {
                const appId = 'testappid';
                const userId = 'testuserid';
                const Headers = {'X-App-Id': appId};
                const fcm = {
                    [appId]: {}
                };
                const req = {
                    params: { userId },
                    get: (header) => Headers[header],
                    body: {}
                };
                const fakeMongoCollection = { findOne: jest.fn().mockRejectedValue(new Error('Mongo Error')) };
                const fakeTargetModel = targetsFactory(fakeMongoCollection);

                await notify2User(fakeTargetModel, fcm)(req, res);

                expect(res.status).toHaveBeenCalledTimes(1);
                expect(res.status).toHaveBeenCalledWith(400);
                expect(res.json).toHaveBeenCalledTimes(1);
                expect(res.json).toHaveBeenCalledWith(encodeError(null, ERROR_DATABASE.code, ERROR_DATABASE.message, {details: 'Mongo Error'}));
            }
        );

        it(
            'return 404 if there are not target with a valid userId',
            async () => {
                const appId = 'testappid';
                const userId = 'useridnotregistered';
                const Headers = {'X-App-Id': appId};
                const fcm = {
                    [appId]: {}
                };
                const req = {
                    params: { userId },
                    get: (header) => Headers[header],
                    body: {}
                };

                await notify2User(targetModel, fcm)(req, res);

                expect(res.status).toHaveBeenCalledTimes(1);
                expect(res.status).toHaveBeenCalledWith(404);
                expect(res.json).toHaveBeenCalledTimes(1);
                expect(res.json).toHaveBeenCalledWith(
                    encodeError(null, ERROR_USER_NOT_FOUND.code, ERROR_USER_NOT_FOUND.message, {details: `${userId} in ${appId} not found`})
                );
            }
        );

        it(
            'send a default notification when found a target with this userId and body null',
            async () => {
                const appId = 'testappid';
                const userId = 'useridnotregistered';
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
                    params: { userId },
                    get: (header) => Headers[header],
                    body: null
                };
                const foundUser = createFakeUser(userId, appId);
                const deviceToken1 = 'tokendevice1';
                const deviceToken2 = 'tokendevice2';
                const firstDevice = {deviceId: 'deviceid1', registerToken: deviceToken1, model: 'xiaomi', platform: 'android'};
                const secondDevice = {deviceId: 'deviceid2', registerToken: deviceToken2, model: 'xr', platform: 'iphone'};
                foundUser.devices = [firstDevice, secondDevice];
                await targetCollection.insertOne(foundUser);

                await notify2User(targetModel, fcm)(req, res);

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
            'send a default notification when found a target with this userId',
            async () => {
                const appId = 'testappid';
                const userId = 'useridnotregistered';
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
                    params: { userId },
                    get: (header) => Headers[header],
                    body: {}
                };
                const foundUser = createFakeUser(userId, appId);
                const deviceToken1 = 'tokendevice1';
                const deviceToken2 = 'tokendevice2';
                const firstDevice = {deviceId: 'deviceid1', registerToken: deviceToken1, model: 'xiaomi', platform: 'android'};
                const secondDevice = {deviceId: 'deviceid2', registerToken: deviceToken2, model: 'xr', platform: 'iphone'};
                foundUser.devices = [firstDevice, secondDevice];
                await targetCollection.insertOne(foundUser);

                await notify2User(targetModel, fcm)(req, res);

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
            'send a custom notification when found a target with this userId',
            async () => {
                const appId = 'testappid';
                const userId = 'useridnotregistered';
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
                    params: { userId },
                    get: (header) => Headers[header],
                    body: {
                        notification: {
                            title: 'testtitle',
                            body: 'testbody'
                        },
                        data: {
                            anyfield: 'testanyfield'
                        }
                    }
                };
                const foundUser = createFakeUser(userId, appId);
                const deviceToken1 = 'tokendevice1';
                const deviceToken2 = 'tokendevice2';
                const firstDevice = {deviceId: 'deviceid1', registerToken: deviceToken1, model: 'xiaomi', platform: 'android'};
                const secondDevice = {deviceId: 'deviceid2', registerToken: deviceToken2, model: 'xr', platform: 'iphone'};
                foundUser.devices = [firstDevice, secondDevice];
                await targetCollection.insertOne(foundUser);

                await notify2User(targetModel, fcm)(req, res);

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
            'send a custom title notification when found a target with this userId',
            async () => {
                const appId = 'testappid';
                const userId = 'useridnotregistered';
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
                    params: { userId },
                    get: (header) => Headers[header],
                    body: {
                        notification: {
                            title: 'testtitle'
                        },
                        data: {
                            anyfield: 'testanyfield'
                        }
                    }
                };
                const foundUser = createFakeUser(userId, appId);
                const deviceToken1 = 'tokendevice1';
                const deviceToken2 = 'tokendevice2';
                const firstDevice = {deviceId: 'deviceid1', registerToken: deviceToken1, model: 'xiaomi', platform: 'android'};
                const secondDevice = {deviceId: 'deviceid2', registerToken: deviceToken2, model: 'xr', platform: 'iphone'};
                foundUser.devices = [firstDevice, secondDevice];
                await targetCollection.insertOne(foundUser);

                await notify2User(targetModel, fcm)(req, res);

                expect(sendToDevice).toHaveBeenCalledTimes(1);
                expect(sendToDevice).toHaveBeenCalledWith(
                    [deviceToken1, deviceToken2],
                    expect.objectContaining({
                        notification: expect.objectContaining({
                            body: 'You have received a Tribeca notification.',
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
            'send a complete custom notification when found a target with this userId',
            async () => {
                const appId = 'testappid';
                const userId = 'useridnotregistered';
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
                    params: { userId },
                    get: (header) => Headers[header],
                    body: {
                        notification: {
                            title: 'testtitle',
                            body: 'testbodynotification',
                            icon: 'soundicon',
                            tag: 'mitag'
                        },
                        data: {
                            anyfield: 'testanyfield'
                        }
                    }
                };
                const foundUser = createFakeUser(userId, appId);
                const deviceToken1 = 'tokendevice1';
                const deviceToken2 = 'tokendevice2';
                const firstDevice = {deviceId: 'deviceid1', registerToken: deviceToken1, model: 'xiaomi', platform: 'android'};
                const secondDevice = {deviceId: 'deviceid2', registerToken: deviceToken2, model: 'xr', platform: 'iphone'};
                foundUser.devices = [firstDevice, secondDevice];
                await targetCollection.insertOne(foundUser);

                await notify2User(targetModel, fcm)(req, res);

                expect(sendToDevice).toHaveBeenCalledTimes(1);
                expect(sendToDevice).toHaveBeenCalledWith(
                    [deviceToken1, deviceToken2],
                    expect.objectContaining({
                        notification: expect.objectContaining({
                            body: 'testbodynotification',
                            title: 'testtitle',
                            icon: 'soundicon',
                            tag: 'mitag'
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
            'send a custom notification without data when found a target with this userId',
            async () => {
                const appId = 'testappid';
                const userId = 'useridnotregistered';
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
                    params: { userId },
                    get: (header) => Headers[header],
                    body: {
                        notification: {
                            title: 'testtitle',
                            body: 'testbodynotification',
                            icon: 'soundicon',
                            tag: 'mitag'
                        }
                    }
                };
                const foundUser = createFakeUser(userId, appId);
                const deviceToken1 = 'tokendevice1';
                const deviceToken2 = 'tokendevice2';
                const firstDevice = {deviceId: 'deviceid1', registerToken: deviceToken1, model: 'xiaomi', platform: 'android'};
                const secondDevice = {deviceId: 'deviceid2', registerToken: deviceToken2, model: 'xr', platform: 'iphone'};
                foundUser.devices = [firstDevice, secondDevice];
                await targetCollection.insertOne(foundUser);

                await notify2User(targetModel, fcm)(req, res);

                expect(sendToDevice).toHaveBeenCalledTimes(1);
                expect(sendToDevice).toHaveBeenCalledWith(
                    [deviceToken1, deviceToken2],
                    expect.objectContaining({
                        notification: expect.objectContaining({
                            body: 'testbodynotification',
                            title: 'testtitle',
                            icon: 'soundicon',
                            tag: 'mitag'
                        })
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
                const deviceId = 'testdeviceid';
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
                    params: { userId },
                    get: (header) => Headers[header],
                    body: {}
                };
                const expectedDevice = {deviceId, registerToken: token, model: 'xiaomi', platform: 'android'};
                const expectedTargetUpdated = createFakeUser(userId, appId);
                expectedTargetUpdated.devices = [expectedDevice];
                await targetCollection.insertOne(expectedTargetUpdated);

                await notify2User(targetModel, fcm)(req, res);

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
