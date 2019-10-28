import {
    startDatabase,
    TARGETS_COLLECTION
} from '../src/database';
import {
    encodeError
} from '../src/utils/error-encoder';
import {
    ERROR_APP_ID,
    ERROR_USER_ID,
    ERROR_DATABASE,
    ERROR_BODY_PARAMS_MISSING
} from '../src/constants/errors';
import targetsFactory from '../src//models/targets';
import config from '../src/config';
import {
    registerDeviceFromAdmin,
    deleteDeviceFromAdmin
} from '../src/routes/register';

const createFakeUser = (userId, appId) => ({
    _id: `${userId}-${appId}`,
    userId,
    appId
});

describe(
    'registerDeviceFromAdmin in register/device route should',
    () => {
        let db,
        targetCollection,
        targetModel;
        const res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
            end: jest.fn().mockReturnThis()
        };

        beforeAll(
            async () => {
                config.mongodb.dbname = 'notifier-test-register-registerDeviceFromAdmin';
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
                const userId = 'usertest';
                const deviceId = 'uniquedeviceid';
                const token = 'tokengeneratedbydeviceusingfirebase';
                const model = 'fakedevice';
                const platform = 'test';
                const Headers = {'X-App-Id': appId};
                const req = {
                    params: { userId },
                    get: (header) => Headers[header],
                    body: {
                        deviceId,
                        token,
                        model,
                        platform
                    }
                };

                await registerDeviceFromAdmin(targetModel)(req, res);

                expect(res.status).toHaveBeenCalledTimes(1);
                expect(res.status).toHaveBeenCalledWith(400);
                expect(res.json).toHaveBeenCalledTimes(1);
                expect(res.json).toHaveBeenCalledWith(encodeError(ERROR_APP_ID));
            }
        );

        it(
            'retrun USER ID Error when no appId found',
            async () => {
                const appId = 'appidtest';
                const userId = undefined;
                const deviceId = 'uniquedeviceid';
                const token = 'tokengeneratedbydeviceusingfirebase';
                const model = 'fakedevice';
                const platform = 'test';
                const Headers = {'X-App-Id': appId};
                const req = {
                    params: { userId },
                    get: (header) => Headers[header],
                    body: {
                        deviceId,
                        token,
                        model,
                        platform
                    }
                };

                await registerDeviceFromAdmin(targetModel)(req, res);

                expect(res.status).toHaveBeenCalledTimes(1);
                expect(res.status).toHaveBeenCalledWith(400);
                expect(res.json).toHaveBeenCalledTimes(1);
                expect(res.json).toHaveBeenCalledWith(encodeError(ERROR_USER_ID));
            }
        );

        it(
            'return MISSING PARAMS Error when no deviceId and token found',
            async () => {
                const appId = 'appidtest';
                const userId = 'usertest';
                const deviceId = undefined;
                const token = undefined;
                const model = 'fakedevice';
                const platform = 'test';
                const Headers = {'X-App-Id': appId};
                const req = {
                    params: { userId },
                    get: (header) => Headers[header],
                    body: {
                        deviceId,
                        token,
                        model,
                        platform
                    }
                };

                await registerDeviceFromAdmin(targetModel)(req, res);

                expect(res.status).toHaveBeenCalledTimes(1);
                expect(res.status).toHaveBeenCalledWith(400);
                expect(res.json).toHaveBeenCalledTimes(1);
                expect(res.json).toHaveBeenCalledWith(
                    encodeError(
                        null,
                        ERROR_BODY_PARAMS_MISSING.code,
                        ERROR_BODY_PARAMS_MISSING.message, {params: ['deviceId', 'token']})
                );
            }
        );

        it(
            'return MISSING PARAMS Error when no body found',
            async () => {
                const appId = 'appidtest';
                const userId = 'usertest';
                const Headers = {'X-App-Id': appId};
                const req = {
                    params: { userId },
                    get: (header) => Headers[header],

                };

                await registerDeviceFromAdmin(targetModel)(req, res);

                expect(res.status).toHaveBeenCalledTimes(1);
                expect(res.status).toHaveBeenCalledWith(400);
                expect(res.json).toHaveBeenCalledTimes(1);
                expect(res.json).toHaveBeenCalledWith(
                    encodeError(
                        null,
                        ERROR_BODY_PARAMS_MISSING.code,
                        ERROR_BODY_PARAMS_MISSING.message,
                        {params: ['deviceId', 'token', 'model', 'platform']}
                    )
                );
            }
        );

        it(
            'retrun DATABASE Error when mongo fails',
            async () => {
                const appId = 'appidtest';
                const userId = 'usertest';
                const deviceId = 'uniquedeviceid';
                const token = 'tokengeneratedbydeviceusingfirebase';
                const model = 'fakedevice';
                const platform = 'test';
                const Headers = {'X-App-Id': appId};
                const req = {
                    params: { userId },
                    get: (header) => Headers[header],
                    body: {
                        deviceId,
                        token,
                        model,
                        platform
                    }
                };
                const fakeMongoCollection = { findOne: jest.fn().mockRejectedValue(new Error('Mongo Error')) };
                const fakeTargetModel = targetsFactory(fakeMongoCollection);

                await registerDeviceFromAdmin(fakeTargetModel)(req, res);

                expect(res.status).toHaveBeenCalledTimes(1);
                expect(res.status).toHaveBeenCalledWith(400);
                expect(res.json).toHaveBeenCalledTimes(1);
                expect(res.json).toHaveBeenCalledWith(encodeError(null, ERROR_DATABASE.code, ERROR_DATABASE.message, {details: 'Mongo Error'}));
            }
        );

        it(
            'create a new target with the device info when target do not exists',
            async () => {
                const appId = 'appidtest';
                const userId = 'usertest';
                const deviceId = 'uniquedeviceid';
                const token = 'tokengeneratedbydeviceusingfirebase';
                const model = 'fakedevice';
                const platform = 'test';
                const Headers = {'X-App-Id': appId};
                const req = {
                    params: { userId },
                    get: (header) => Headers[header],
                    body: {
                        deviceId,
                        token,
                        model,
                        platform
                    }
                };
                const expectedTargetCreated = createFakeUser(userId, appId);
                expectedTargetCreated.devices = [{deviceId, registerToken: token, model, platform}];

                await registerDeviceFromAdmin(targetModel)(req, res);

                const targetCreated = await targetCollection.findOne({_id: `${userId}-${appId}`});

                expect(res.status).toHaveBeenCalledTimes(1);
                expect(res.status).toHaveBeenCalledWith(204);
                expect(res.end).toHaveBeenCalledTimes(1);
                expect(res.end).toHaveBeenCalledWith();
                expect(targetCreated).toEqual(expect.objectContaining(expectedTargetCreated));
            }
        );

        it(
            'add a device info when target already exists but without devices',
            async () => {
                const appId = 'appidtest';
                const userId = 'usertest';
                const deviceId = 'uniquedeviceid';
                const token = 'tokengeneratedbydeviceusingfirebase';
                const model = 'fakedevice';
                const platform = 'test';
                const Headers = {'X-App-Id': appId};
                const req = {
                    params: { userId },
                    get: (header) => Headers[header],
                    body: {
                        deviceId,
                        token,
                        model,
                        platform
                    }
                };
                const newDevice = {deviceId, registerToken: token, model, platform};
                const expectedTargetUpdated = createFakeUser(userId, appId);
                expectedTargetUpdated.topics = ['topic1', 'topic2'];
                expectedTargetUpdated.emails = ['email1@email.com', 'email2@email2.com'];
                await targetCollection.insertOne(expectedTargetUpdated);
                expectedTargetUpdated.devices = [newDevice];

                await registerDeviceFromAdmin(targetModel)(req, res);

                const targetUpdated = await targetCollection.findOne({_id: `${userId}-${appId}`});

                expect(res.status).toHaveBeenCalledTimes(1);
                expect(res.status).toHaveBeenCalledWith(204);
                expect(res.end).toHaveBeenCalledTimes(1);
                expect(res.end).toHaveBeenCalledWith();
                expect(targetUpdated).toEqual(expect.objectContaining(expectedTargetUpdated));
            }
        );

        it(
            'add a device info when target already exists and already has a device',
            async () => {
                const appId = 'appidtest';
                const userId = 'usertest';
                const deviceId = 'uniquedeviceid';
                const token = 'tokengeneratedbydeviceusingfirebase';
                const model = 'fakedevice';
                const platform = 'test';
                const Headers = {'X-App-Id': appId};
                const req = {
                    params: { userId },
                    get: (header) => Headers[header],
                    body: {
                        deviceId,
                        token,
                        model,
                        platform
                    }
                };
                const prevDevice = {deviceId: 'prevId', registerToken: 'prevToken', model: 'xiaomi', platform: 'android'};
                const newDevice = {deviceId, registerToken: token, model, platform};
                const expectedTargetUpdated = createFakeUser(userId, appId);
                expectedTargetUpdated.devices = [prevDevice];
                expectedTargetUpdated.topics = ['topic1', 'topic2'];
                expectedTargetUpdated.emails = ['email1@email.com', 'email2@email2.com'];
                await targetCollection.insertOne(expectedTargetUpdated);
                expectedTargetUpdated.devices = [prevDevice, newDevice];

                await registerDeviceFromAdmin(targetModel)(req, res);

                const targetUpdated = await targetCollection.findOne({_id: `${userId}-${appId}`});

                expect(res.status).toHaveBeenCalledTimes(1);
                expect(res.status).toHaveBeenCalledWith(204);
                expect(res.end).toHaveBeenCalledTimes(1);
                expect(res.end).toHaveBeenCalledWith();
                expect(targetUpdated).toEqual(expect.objectContaining(expectedTargetUpdated));
            }
        );

        it(
            'update a device info when target already exists and this device',
            async () => {
                const appId = 'appidtest';
                const userId = 'usertest';
                const deviceId = 'uniquedeviceid';
                const token = 'tokengeneratedbydeviceusingfirebase';
                const model = 'fakedevice';
                const platform = 'test';
                const Headers = {'X-App-Id': appId};
                const req = {
                    params: { userId },
                    get: (header) => Headers[header],
                    body: {
                        deviceId,
                        token,
                        model,
                        platform
                    }
                };
                const prevDevice = {deviceId, registerToken: 'oldtokentobeupdated', model, platform};
                const newDevice = {deviceId, registerToken: token, model, platform};
                const expectedTargetUpdated = createFakeUser(userId, appId);
                expectedTargetUpdated.devices = [prevDevice];
                expectedTargetUpdated.topics = ['topic1', 'topic2'];
                expectedTargetUpdated.emails = ['email1@email.com', 'email2@email2.com'];
                await targetCollection.insertOne(expectedTargetUpdated);
                expectedTargetUpdated.devices = [newDevice];

                await registerDeviceFromAdmin(targetModel)(req, res);

                const targetUpdated = await targetCollection.findOne({_id: `${userId}-${appId}`});

                expect(res.status).toHaveBeenCalledTimes(1);
                expect(res.status).toHaveBeenCalledWith(204);
                expect(res.end).toHaveBeenCalledTimes(1);
                expect(res.end).toHaveBeenCalledWith();
                expect(targetUpdated).toEqual(expect.objectContaining(expectedTargetUpdated));
            }
        );
    }
);

describe(
    'deleteDeviceFromAdmin in register/device route should',
    () => {
        let db,
        targetCollection,
        targetModel;
        const res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
            end: jest.fn().mockReturnThis()
        };

        beforeAll(
            async () => {
                config.mongodb.dbname = 'notifier-test-register-deleteDeviceFromAdmin';
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
                const userId = 'usertest';
                const deviceId = 'uniquedeviceid';
                const Headers = {'X-App-Id': appId};
                const req = {
                    params: { userId },
                    get: (header) => Headers[header],
                    body: {
                        deviceId
                    }
                };

                await deleteDeviceFromAdmin(targetModel)(req, res);

                expect(res.status).toHaveBeenCalledTimes(1);
                expect(res.status).toHaveBeenCalledWith(400);
                expect(res.json).toHaveBeenCalledTimes(1);
                expect(res.json).toHaveBeenCalledWith(encodeError(ERROR_APP_ID));
            }
        );

        it(
            'retrun USER ID Error when no appId found',
            async () => {
                const appId = 'appidtest';
                const userId = undefined;
                const deviceId = 'uniquedeviceid';
                const Headers = {'X-App-Id': appId};
                const req = {
                    params: { userId },
                    get: (header) => Headers[header],
                    body: {
                        deviceId
                    }
                };

                await deleteDeviceFromAdmin(targetModel)(req, res);

                expect(res.status).toHaveBeenCalledTimes(1);
                expect(res.status).toHaveBeenCalledWith(400);
                expect(res.json).toHaveBeenCalledTimes(1);
                expect(res.json).toHaveBeenCalledWith(encodeError(ERROR_USER_ID));
            }
        );

        it(
            'return MISSING PARAMS Error when no deviceId found',
            async () => {
                const appId = 'appidtest';
                const userId = 'usertest';
                const deviceId = undefined;
                const Headers = {'X-App-Id': appId};
                const req = {
                    params: { userId },
                    get: (header) => Headers[header],
                    body: {
                        deviceId
                    }
                };

                await deleteDeviceFromAdmin(targetModel)(req, res);

                expect(res.status).toHaveBeenCalledTimes(1);
                expect(res.status).toHaveBeenCalledWith(400);
                expect(res.json).toHaveBeenCalledTimes(1);
                expect(res.json).toHaveBeenCalledWith(
                    encodeError(
                        null,
                        ERROR_BODY_PARAMS_MISSING.code,
                        ERROR_BODY_PARAMS_MISSING.message, {params: ['deviceId']})
                );
            }
        );

        it(
            'return MISSING PARAMS Error when no body found',
            async () => {
                const appId = 'appidtest';
                const userId = 'usertest';
                const Headers = {'X-App-Id': appId};
                const req = {
                    params: { userId },
                    get: (header) => Headers[header],

                };

                await deleteDeviceFromAdmin(targetModel)(req, res);

                expect(res.status).toHaveBeenCalledTimes(1);
                expect(res.status).toHaveBeenCalledWith(400);
                expect(res.json).toHaveBeenCalledTimes(1);
                expect(res.json).toHaveBeenCalledWith(
                    encodeError(
                        null,
                        ERROR_BODY_PARAMS_MISSING.code,
                        ERROR_BODY_PARAMS_MISSING.message,
                        {params: ['deviceId']}
                    )
                );
            }
        );

        it(
            'retrun DATABASE Error when no appId found',
            async () => {
                const appId = 'appidtest';
                const userId = 'usertest';
                const deviceId = 'uniquedeviceid';
                const Headers = {'X-App-Id': appId};
                const req = {
                    params: { userId },
                    get: (header) => Headers[header],
                    body: {
                        deviceId
                    }
                };
                const fakeMongoCollection = { updateOne: jest.fn().mockRejectedValue(new Error('Mongo Error')) };
                const fakeTargetModel = targetsFactory(fakeMongoCollection);

                await deleteDeviceFromAdmin(fakeTargetModel)(req, res);

                expect(res.status).toHaveBeenCalledTimes(1);
                expect(res.status).toHaveBeenCalledWith(400);
                expect(res.json).toHaveBeenCalledTimes(1);
                expect(res.json).toHaveBeenCalledWith(encodeError(null, ERROR_DATABASE.code, ERROR_DATABASE.message, {details: 'Mongo Error'}));
            }
        );

        it(
            'retrun 204 when target do not exists',
            async () => {
                const appId = 'appidtest';
                const userId = 'usertest';
                const deviceId = 'uniquedeviceid';
                const Headers = {'X-App-Id': appId};
                const req = {
                    params: { userId },
                    get: (header) => Headers[header],
                    body: {
                        deviceId
                    }
                };

                await deleteDeviceFromAdmin(targetModel)(req, res);

                expect(res.status).toHaveBeenCalledTimes(1);
                expect(res.status).toHaveBeenCalledWith(204);
                expect(res.end).toHaveBeenCalledTimes(1);
                expect(res.end).toHaveBeenCalledWith();
            }
        );

        it(
            'retrun 204 when devices do not exists',
            async () => {
                const appId = 'appidtest';
                const userId = 'usertest';
                const deviceId = 'uniquedeviceid';
                const Headers = {'X-App-Id': appId};
                const req = {
                    params: { userId },
                    get: (header) => Headers[header],
                    body: {
                        deviceId
                    }
                };
                const expectedTargetUpdated = createFakeUser(userId, appId);
                expectedTargetUpdated.topics = ['topic1', 'topic2'];
                expectedTargetUpdated.emails = ['email1@email.com', 'email2@email2.com'];
                await targetCollection.insertOne(expectedTargetUpdated);

                await deleteDeviceFromAdmin(targetModel)(req, res);
                const targetUpdated = await targetCollection.findOne({_id: `${userId}-${appId}`});

                expect(res.status).toHaveBeenCalledTimes(1);
                expect(res.status).toHaveBeenCalledWith(204);
                expect(res.end).toHaveBeenCalledTimes(1);
                expect(res.end).toHaveBeenCalledWith();
                expect(targetUpdated).toEqual(expect.objectContaining(expectedTargetUpdated));
            }
        );

        it(
            'retrun 204 when deviceId do not exists',
            async () => {
                const appId = 'appidtest';
                const userId = 'usertest';
                const deviceId = 'uniquedeviceid';
                const Headers = {'X-App-Id': appId};
                const req = {
                    params: { userId },
                    get: (header) => Headers[header],
                    body: {
                        deviceId
                    }
                };
                const device = {deviceId: 'otherdeviceid', registerToken: 'tokenotherdevice', model: 'xiaomi', platform: 'android'};
                const expectedTargetUpdated = createFakeUser(userId, appId);
                expectedTargetUpdated.topics = ['topic1', 'topic2'];
                expectedTargetUpdated.emails = ['email1@email.com', 'email2@email2.com'];
                expectedTargetUpdated.devices = [device];
                await targetCollection.insertOne(expectedTargetUpdated);

                await deleteDeviceFromAdmin(targetModel)(req, res);
                const targetUpdated = await targetCollection.findOne({_id: `${userId}-${appId}`});

                expect(res.status).toHaveBeenCalledTimes(1);
                expect(res.status).toHaveBeenCalledWith(204);
                expect(res.end).toHaveBeenCalledTimes(1);
                expect(res.end).toHaveBeenCalledWith();
                expect(targetUpdated).toEqual(expect.objectContaining(expectedTargetUpdated));
            }
        );

        it(
            'retrun 204 when  a device with deviceId is found and updated',
            async () => {
                const appId = 'appidtest';
                const userId = 'usertest';
                const deviceId = 'uniquedeviceid';
                const Headers = {'X-App-Id': appId};
                const req = {
                    params: { userId },
                    get: (header) => Headers[header],
                    body: {
                        deviceId
                    }
                };
                const device = {deviceId, registerToken: 'tokenfromdevice', model: 'xiaomi', platform: 'android'};
                const expectedTargetUpdated = createFakeUser(userId, appId);
                expectedTargetUpdated.devices = [device];
                expectedTargetUpdated.topics = ['topic1', 'topic2'];
                expectedTargetUpdated.emails = ['email1@email.com', 'email2@email2.com'];
                await targetCollection.insertOne(expectedTargetUpdated);
                expectedTargetUpdated.devices = [];

                await deleteDeviceFromAdmin(targetModel)(req, res);
                const targetUpdated = await targetCollection.findOne({_id: `${userId}-${appId}`});

                expect(res.status).toHaveBeenCalledTimes(1);
                expect(res.status).toHaveBeenCalledWith(204);
                expect(res.end).toHaveBeenCalledTimes(1);
                expect(res.end).toHaveBeenCalledWith();
                expect(targetUpdated).toEqual(expect.objectContaining(expectedTargetUpdated));
            }
        );
    }
);
