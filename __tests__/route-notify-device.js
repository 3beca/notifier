import {
    startDatabase,
    TARGETS_COLLECTION
} from '../src/database';
import config from '../src/config';
import targetsFactory from '../src/models/targets';
import { encodeError } from '../src/utils/error-encoder';
import {
    ERROR_APP_ID,
    ERROR_DEVICE_ID,
    ERROR_DATABASE,
    ERROR_DEVICE_NOT_FOUND,
    ERROR_FCM_SENDING_NOTIFICATION,
    ERROR_FCM_NOT_FOUND
} from '../src/constants/errors';
import {
    notify2Device
} from '../src/routes/notify';

const createFakeUser = (userId, appId) => ({
    _id: `${userId}-${appId}`,
    userId,
    appId
});

describe(
    'notify2Device in notify/device/deviceId route should',
    () => {
        const res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
            end: jest.fn().mockReturnThis()
        };
        let db, targetCollection, targetModel;
        beforeAll(
            async () => {
                config.mongodb.dbname = 'notifier-test-notify-notify2Device';
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
                const deviceId = 'testdeviceid';
                const Headers = {'X-App-Id': appId};
                const fcm = {
                    [appId]: {}
                };
                const req = {
                    params: { deviceId },
                    get: (header) => Headers[header],
                    body: {}
                };

                await notify2Device(targetModel, fcm)(req, res);

                expect(res.status).toHaveBeenCalledTimes(1);
                expect(res.status).toHaveBeenCalledWith(400);
                expect(res.json).toHaveBeenCalledTimes(1);
                expect(res.json).toHaveBeenCalledWith(encodeError(ERROR_APP_ID));
            }
        );

        it(
            'retrun DEVICE ID Error when no deviceId not found',
            async () => {
                const appId = 'testappid';
                const deviceId = undefined;
                const Headers = {'X-App-Id': appId};
                const fcm = {
                    [appId]: {}
                };
                const req = {
                    params: { deviceId },
                    get: (header) => Headers[header],
                    body: {}
                };

                await notify2Device(targetModel, fcm)(req, res);

                expect(res.status).toHaveBeenCalledTimes(1);
                expect(res.status).toHaveBeenCalledWith(400);
                expect(res.json).toHaveBeenCalledTimes(1);
                expect(res.json).toHaveBeenCalledWith(encodeError(ERROR_DEVICE_ID));
            }
        );

        it(
            'retrun FCM APP Error when no fcmApp found for appId',
            async () => {
                const appId = 'testappid';
                const deviceId = 'testdeviceid';
                const Headers = {'X-App-Id': appId};
                const fcm = {
                    [appId]: undefined
                };
                const req = {
                    params: { deviceId },
                    get: (header) => Headers[header],
                    body: {}
                };

                await notify2Device(targetModel, fcm)(req, res);

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
                const deviceId = 'testdeviceid';
                const Headers = {'X-App-Id': appId};
                const fcm = {
                    [appId]: {}
                };
                const req = {
                    params: { deviceId },
                    get: (header) => Headers[header],
                    body: {}
                };
                const fakeMongoCollection = { findOne: jest.fn().mockRejectedValue(new Error('Mongo Error')) };
                const fakeTargetModel = targetsFactory(fakeMongoCollection);

                await notify2Device(fakeTargetModel, fcm)(req, res);

                expect(res.status).toHaveBeenCalledTimes(1);
                expect(res.status).toHaveBeenCalledWith(400);
                expect(res.json).toHaveBeenCalledTimes(1);
                expect(res.json).toHaveBeenCalledWith(encodeError(null, ERROR_DATABASE.code, ERROR_DATABASE.message, {details: 'Mongo Error'}));
            }
        );

        it(
            'return DEVICE ID NOT FOUND when user has not this device',
            async () => {
                const appId = 'testappid';
                const deviceId = 'testdeviceid';
                const userId = 'testuserid';
                const Headers = {'X-App-Id': appId};
                const fcm = {
                    [appId]: {}
                };
                const req = {
                    params: { deviceId },
                    get: (header) => Headers[header],
                    body: {}
                };
                const expectedTargetUpdated = createFakeUser(userId, appId);
                await targetCollection.insertOne(expectedTargetUpdated);

                await notify2Device(targetModel, fcm)(req, res);

                expect(res.status).toHaveBeenCalledTimes(1);
                expect(res.status).toHaveBeenCalledWith(404);
                expect(res.json).toHaveBeenCalledTimes(1);
                expect(res.json).toHaveBeenCalledWith(
                    encodeError(
                        null,
                        ERROR_DEVICE_NOT_FOUND.code,
                        ERROR_DEVICE_NOT_FOUND.message,
                        {details: `deviceId ${deviceId} not found in ${appId}`}
                    )
                );
            }
        );

        it(
            'return DEVICE ID NOT FOUND when user has other device',
            async () => {
                const appId = 'testappid';
                const deviceId = 'testdeviceid';
                const userId = 'testuserid';
                const Headers = {'X-App-Id': appId};
                const fcm = {
                    [appId]: {}
                };
                const req = {
                    params: { deviceId },
                    get: (header) => Headers[header],
                    body: {}
                };
                const otherDevice = {deviceId: 'otherdeviceid', registerToken: 'otherregistertoken', model: 'xiaomi', platform: 'android'};
                const expectedTarget = createFakeUser(userId, appId);
                expectedTarget.devices = [otherDevice];
                await targetCollection.insertOne(expectedTarget);

                await notify2Device(targetModel, fcm)(req, res);

                expect(res.status).toHaveBeenCalledTimes(1);
                expect(res.status).toHaveBeenCalledWith(404);
                expect(res.json).toHaveBeenCalledTimes(1);
                expect(res.json).toHaveBeenCalledWith(
                    encodeError(
                        null,
                        ERROR_DEVICE_NOT_FOUND.code,
                        ERROR_DEVICE_NOT_FOUND.message,
                        {details: `deviceId ${deviceId} not found in ${appId}`}
                    )
                );
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
                    params: { deviceId },
                    get: (header) => Headers[header],
                    body: {}
                };
                const otherDevice = {deviceId: 'otherdeviceid', registerToken: 'otherregistertoken', model: 'xiaomi', platform: 'android'};
                const expectedDevice = {deviceId, registerToken: token, model: 'xiaomi', platform: 'android'};
                const expectedTargetUpdated = createFakeUser(userId, appId);
                expectedTargetUpdated.devices = [expectedDevice, otherDevice];
                await targetCollection.insertOne(expectedTargetUpdated);

                await notify2Device(targetModel, fcm)(req, res);

                expect(sendToDevice).toHaveBeenCalledTimes(1);
                expect(sendToDevice).toHaveBeenCalledWith(
                    token,
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

        it(
            'send a default notification when body has is null',
            async () => {
                const appId = 'testappid';
                const deviceId = 'testdeviceid';
                const userId = 'testuserid';
                const Headers = {'X-App-Id': appId};
                const token = 'tsttokenfromtestuser';
                const sendToDevice = jest.fn().mockResolvedValue({});
                const fcm = {
                    [appId]: {
                        messaging: () => ({
                            sendToDevice
                        })
                    }
                };
                const req = {
                    params: { deviceId },
                    get: (header) => Headers[header],
                    body: null
                };
                const otherDevice = {deviceId: 'otherdeviceid', registerToken: 'otherregistertoken', model: 'xiaomi', platform: 'android'};
                const expectedDevice = {deviceId, registerToken: token, model: 'xiaomi', platform: 'android'};
                const expectedTargetUpdated = createFakeUser(userId, appId);
                expectedTargetUpdated.devices = [expectedDevice, otherDevice];
                await targetCollection.insertOne(expectedTargetUpdated);

                await notify2Device(targetModel, fcm)(req, res);

                expect(sendToDevice).toHaveBeenCalledTimes(1);
                expect(sendToDevice).toHaveBeenCalledWith(
                    token,
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
            'send a default notification when body has not notification',
            async () => {
                const appId = 'testappid';
                const deviceId = 'testdeviceid';
                const userId = 'testuserid';
                const Headers = {'X-App-Id': appId};
                const token = 'tsttokenfromtestuser';
                const sendToDevice = jest.fn().mockResolvedValue({});
                const fcm = {
                    [appId]: {
                        messaging: () => ({
                            sendToDevice
                        })
                    }
                };
                const req = {
                    params: { deviceId },
                    get: (header) => Headers[header],
                    body: {}
                };
                const otherDevice = {deviceId: 'otherdeviceid', registerToken: 'otherregistertoken', model: 'xiaomi', platform: 'android'};
                const expectedDevice = {deviceId, registerToken: token, model: 'xiaomi', platform: 'android'};
                const expectedTargetUpdated = createFakeUser(userId, appId);
                expectedTargetUpdated.devices = [expectedDevice, otherDevice];
                await targetCollection.insertOne(expectedTargetUpdated);

                await notify2Device(targetModel, fcm)(req, res);

                expect(sendToDevice).toHaveBeenCalledTimes(1);
                expect(sendToDevice).toHaveBeenCalledWith(
                    token,
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
            'send a custom notification when body has notification and data',
            async () => {
                const appId = 'testappid';
                const deviceId = 'testdeviceid';
                const userId = 'testuserid';
                const Headers = {'X-App-Id': appId};
                const token = 'tsttokenfromtestuser';
                const sendToDevice = jest.fn().mockResolvedValue({});
                const fcm = {
                    [appId]: {
                        messaging: () => ({
                            sendToDevice
                        })
                    }
                };
                const req = {
                    params: { deviceId },
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
                const otherDevice = {deviceId: 'otherdeviceid', registerToken: 'otherregistertoken', model: 'xiaomi', platform: 'android'};
                const expectedDevice = {deviceId, registerToken: token, model: 'xiaomi', platform: 'android'};
                const expectedTargetUpdated = createFakeUser(userId, appId);
                expectedTargetUpdated.devices = [expectedDevice, otherDevice];
                await targetCollection.insertOne(expectedTargetUpdated);

                await notify2Device(targetModel, fcm)(req, res);

                expect(sendToDevice).toHaveBeenCalledTimes(1);
                expect(sendToDevice).toHaveBeenCalledWith(
                    token,
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
    }
);
