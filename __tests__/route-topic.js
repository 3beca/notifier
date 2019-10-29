import {
    startDatabase,
    TARGETS_COLLECTION
} from '../src/database';
import {
    getTopicsFromUser,
    addUser2Topics,
    deleteAllUsersFromTopics,
    deleteUserFromTopics
} from '../src/routes/topics';
import {
    encodeError
} from '../src/utils/error-encoder';
import {
    ERROR_APP_ID,
    ERROR_USER_ID,
    ERROR_BODY_PARAMS_MISSING,
    ERROR_USER_NOT_FOUND,
    ERROR_DATABASE
} from '../src/constants/errors';
import targetsFactory from '../src//models/targets';
import config from '../src/config';

const createFakeUser = (userId, appId, topics) => ({
    _id: `${userId}-${appId}`,
    userId,
    appId,
    topics
});

describe(
    'Topic route getTopicsFromUser',
    () => {
        let db,
            targetCollection,
            targetModel;
        const res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis()
        };

        beforeAll(
            async () => {
                config.mongodb.dbname = 'notifier-test-topic-admin-getTopicsFromUser';
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
            'return an array with its topics',
            async () => {
                const appId = 'testingApp';
                const userId = 'testingUser';
                const Headers = {'X-App-Id': appId};
                const req = {
                    params: { userId },
                    get: (header) => Headers[header]
                };
                const topicsExpected = ['topic1', 'topic2', 'topic3'];
                await targetCollection.insertOne(createFakeUser(userId, appId, topicsExpected));

                await getTopicsFromUser(targetModel)(req, res);

                expect(res.status).toHaveBeenCalledTimes(1);
                expect(res.status).toHaveBeenCalledWith(200);
                expect(res.json).toHaveBeenCalledTimes(1);
                expect(res.json).toHaveBeenCalledWith(expect.arrayContaining(topicsExpected));
            }
        );

        it(
            'return an empty array when no topics found',
            async () => {
                const appId = 'testingApp';
                const userId = 'testingUser';
                const Headers = {'X-App-Id': appId};
                const req = {
                    params: { userId },
                    get: (header) => Headers[header]
                };
                const topicsExpected = [];

                await getTopicsFromUser(targetModel)(req, res);

                expect(res.status).toHaveBeenCalledTimes(1);
                expect(res.status).toHaveBeenCalledWith(200);
                expect(res.json).toHaveBeenCalledTimes(1);
                expect(res.json).toHaveBeenCalledWith(expect.arrayContaining(topicsExpected));
            }
        );

        it(
            'return APPID error when no receive appId',
            async () => {
                const appId = undefined;
                const userId = 'testingUser';
                const Headers = {'X-App-Id': appId};
                const req = {
                    params: { userId },
                    get: (header) => Headers[header]
                };
                const topicsExpected = [];

                await getTopicsFromUser(targetModel)(req, res);

                expect(res.status).toHaveBeenCalledTimes(1);
                expect(res.status).toHaveBeenCalledWith(400);
                expect(res.json).toHaveBeenCalledTimes(1);
                expect(res.json).toHaveBeenCalledWith(encodeError(ERROR_APP_ID));
            }
        );

        it(
            'return USERID error when no receive userId',
            async () => {
                const appId = 'testingAppId';
                const userId = undefined;
                const Headers = {'X-App-Id': appId};
                const req = {
                    params: { userId },
                    get: (header) => Headers[header]
                };
                const topicsExpected = [];

                await getTopicsFromUser(targetModel)(req, res);

                expect(res.status).toHaveBeenCalledTimes(1);
                expect(res.status).toHaveBeenCalledWith(400);
                expect(res.json).toHaveBeenCalledTimes(1);
                expect(res.json).toHaveBeenCalledWith(encodeError(ERROR_USER_ID));
            }
        );

        it(
            'return DATABASE error when mongo fails',
            async () => {
                const appId = 'testingAppId';
                const userId = 'testingUserId';
                const Headers = {'X-App-Id': appId};
                const req = {
                    params: { userId },
                    get: (header) => Headers[header]
                };
                const fakeMongoCollection = { findOne: jest.fn().mockRejectedValue(new Error('Mongo Error')) };
                const fakeTargetModel = targetsFactory(fakeMongoCollection);

                await getTopicsFromUser(fakeTargetModel)(req, res);

                expect(res.status).toHaveBeenCalledTimes(1);
                expect(res.status).toHaveBeenCalledWith(400);
                expect(res.json).toHaveBeenCalledTimes(1);
                expect(res.json).toHaveBeenCalledWith(encodeError(null, ERROR_DATABASE.code, ERROR_DATABASE.message, {details: 'Mongo Error'}));
            }
        );
    }
);

describe(
    'Topic route addUser2Topics',
    () => {
        let db,
            targetCollection,
            targetModel;
        const res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis()
        };

        beforeAll(
            async () => {
                config.mongodb.dbname = 'notifier-test-topic-admin-addUser2Topics';
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
            'return APPID error when no receive appId',
            async () => {
                const appId = undefined;
                const userId = 'testingUser';
                const topics = ['topic1'];
                const Headers = {'X-App-Id': appId};
                const req = {
                    params: { userId },
                    get: (header) => Headers[header],
                    body: { topics }
                };

                await addUser2Topics(targetModel)(req, res);

                expect(res.status).toHaveBeenCalledTimes(1);
                expect(res.status).toHaveBeenCalledWith(400);
                expect(res.json).toHaveBeenCalledTimes(1);
                expect(res.json).toHaveBeenCalledWith(encodeError(ERROR_APP_ID));
            }
        );

        it(
            'return USERID error when no receive userId',
            async () => {
                const appId = 'testingAppId';
                const userId = undefined;
                const topics = ['topic1'];
                const Headers = {'X-App-Id': appId};
                const req = {
                    params: { userId },
                    get: (header) => Headers[header],
                    body: { topics }
                };

                await addUser2Topics(targetModel)(req, res);

                expect(res.status).toHaveBeenCalledTimes(1);
                expect(res.status).toHaveBeenCalledWith(400);
                expect(res.json).toHaveBeenCalledTimes(1);
                expect(res.json).toHaveBeenCalledWith(encodeError(ERROR_USER_ID));
            }
        );

        it(
            'return NO TOPIC error when no receive topics',
            async () => {
                const appId = 'testingAppId';
                const userId = 'testingUserId';
                const topics = undefined;
                const Headers = {'X-App-Id': appId};
                const req = {
                    params: { userId },
                    get: (header) => Headers[header],
                    body: { topics }
                };

                await addUser2Topics(targetModel)(req, res);

                expect(res.status).toHaveBeenCalledTimes(1);
                expect(res.status).toHaveBeenCalledWith(400);
                expect(res.json).toHaveBeenCalledTimes(1);
                expect(res.json).toHaveBeenCalledWith(
                    encodeError(null, ERROR_BODY_PARAMS_MISSING.code, ERROR_BODY_PARAMS_MISSING.message, {params: ['topics']})
                );
            }
        );

        it(
            'return USER NOT FOUND error when user is not found in mongo',
            async () => {
                const appId = 'testingAppId';
                const userId = 'testingUserId';
                const topics = ['topic1'];
                const Headers = {'X-App-Id': appId};
                const req = {
                    params: { userId },
                    get: (header) => Headers[header],
                    body: { topics }
                };

                await addUser2Topics(targetModel)(req, res);

                expect(res.status).toHaveBeenCalledTimes(1);
                expect(res.status).toHaveBeenCalledWith(404);
                expect(res.json).toHaveBeenCalledTimes(1);
                expect(res.json).toHaveBeenCalledWith(
                    encodeError(null, ERROR_USER_NOT_FOUND.code, ERROR_USER_NOT_FOUND.message, {details: `${userId} in ${appId} not found`})
                );
            }
        );

        it(
            'return 200 with topics added when insert a list of topics',
            async () => {
                const appId = 'testingAppId';
                const userId = 'testingUserId';
                const prevTopics = ['previous', 'topic'];
                const topics = ['topic1', 'topic2'];
                const Headers = {'X-App-Id': appId};
                const req = {
                    params: { userId },
                    get: (header) => Headers[header],
                    body: { topics }
                };
                await targetCollection.insertOne(createFakeUser(userId, appId, prevTopics));

                await addUser2Topics(targetModel)(req, res);

                const expectedTopics = await targetCollection.findOne({_id: `${userId}-${appId}`});

                expect(res.status).toHaveBeenCalledTimes(1);
                expect(res.status).toHaveBeenCalledWith(200);
                expect(res.json).toHaveBeenCalledTimes(1);
                expect(res.json).toHaveBeenCalledWith({topics});
                expect(expectedTopics.topics.length).toBe(prevTopics.length + topics.length);
                [...prevTopics, ...topics].map(
                    (topic, index) => expect(topic).toEqual(expectedTopics.topics[index])
                );
            }
        );

        it(
            'return 200 with topics added when insert only one topic',
            async () => {
                const appId = 'testingAppId';
                const userId = 'testingUserId';
                const prevTopics = ['previous', 'topic'];
                const topics = 'topic1';
                const Headers = {'X-App-Id': appId};
                const req = {
                    params: { userId },
                    get: (header) => Headers[header],
                    body: { topics }
                };
                await targetCollection.insertOne(createFakeUser(userId, appId, prevTopics));

                await addUser2Topics(targetModel)(req, res);

                const expectedTopics = await targetCollection.findOne({_id: `${userId}-${appId}`});

                expect(res.status).toHaveBeenCalledTimes(1);
                expect(res.status).toHaveBeenCalledWith(200);
                expect(res.json).toHaveBeenCalledTimes(1);
                expect(res.json).toHaveBeenCalledWith({topics});
                expect(expectedTopics.topics.length).toBe(prevTopics.length + 1);
                [...prevTopics, topics].map(
                    (topic, index) => expect(topic).toEqual(expectedTopics.topics[index])
                );
            }
        );

        it(
            'avoid insert topics duplicated',
            async () => {
                const appId = 'testingAppId';
                const userId = 'testingUserId';
                const prevTopics = ['previous', 'topic1'];
                const topics = 'topic1';
                const Headers = {'X-App-Id': appId};
                const req = {
                    params: { userId },
                    get: (header) => Headers[header],
                    body: { topics }
                };
                await targetCollection.insertOne(createFakeUser(userId, appId, prevTopics));

                await addUser2Topics(targetModel)(req, res);

                const expectedTopics = await targetCollection.findOne({_id: `${userId}-${appId}`});

                expect(res.status).toHaveBeenCalledTimes(1);
                expect(res.status).toHaveBeenCalledWith(200);
                expect(res.json).toHaveBeenCalledTimes(1);
                expect(res.json).toHaveBeenCalledWith({topics});
                expect(expectedTopics.topics.length).toBe(prevTopics.length);
                [...prevTopics].map(
                    (topic, index) => expect(topic).toEqual(expectedTopics.topics[index])
                );
            }
        );

        it(
            'return 200 when topics already exists in user',
            async () => {
                const appId = 'testingAppId';
                const userId = 'testingUserId';
                const prevTopics = ['topic1', 'topic2'];
                const topics = ['topic1', 'topic2'];
                const Headers = {'X-App-Id': appId};
                const req = {
                    params: { userId },
                    get: (header) => Headers[header],
                    body: { topics }
                };
                await targetCollection.insertOne(createFakeUser(userId, appId, prevTopics));

                await addUser2Topics(targetModel)(req, res);

                const expectedTopics = await targetCollection.findOne({_id: `${userId}-${appId}`});

                expect(res.status).toHaveBeenCalledTimes(1);
                expect(res.status).toHaveBeenCalledWith(200);
                expect(res.json).toHaveBeenCalledTimes(1);
                expect(res.json).toHaveBeenCalledWith({topics});
                expect(expectedTopics.topics.length).toBe(prevTopics.length);
                [...prevTopics].map(
                    (topic, index) => expect(topic).toEqual(expectedTopics.topics[index])
                );
            }
        );

        it(
            'return 200 when a topic already exists in user',
            async () => {
                const appId = 'testingAppId';
                const userId = 'testingUserId';
                const prevTopics = ['topic1', 'topic2'];
                const topics = 'topic1';
                const Headers = {'X-App-Id': appId};
                const req = {
                    params: { userId },
                    get: (header) => Headers[header],
                    body: { topics }
                };
                await targetCollection.insertOne(createFakeUser(userId, appId, prevTopics));

                await addUser2Topics(targetModel)(req, res);

                const expectedTopics = await targetCollection.findOne({_id: `${userId}-${appId}`});

                expect(res.status).toHaveBeenCalledTimes(1);
                expect(res.status).toHaveBeenCalledWith(200);
                expect(res.json).toHaveBeenCalledTimes(1);
                expect(res.json).toHaveBeenCalledWith({topics});
                expect(expectedTopics.topics.length).toBe(prevTopics.length);
                [...prevTopics].map(
                    (topic, index) => expect(topic).toEqual(expectedTopics.topics[index])
                );
            }
        );

        it(
            'return DATABASE error when mongo fails',
            async () => {
                const appId = 'testingAppId';
                const userId = 'testingUserId';
                const topics = ['topic1'];
                const Headers = {'X-App-Id': appId};
                const req = {
                    params: { userId },
                    get: (header) => Headers[header],
                    body: { topics }
                };
                const fakeMongoCollection = { updateOne: jest.fn().mockRejectedValue(new Error('Mongo Error')) };
                const fakeTargetModel = targetsFactory(fakeMongoCollection);

                await addUser2Topics(fakeTargetModel)(req, res);

                expect(res.status).toHaveBeenCalledTimes(1);
                expect(res.status).toHaveBeenCalledWith(400);
                expect(res.json).toHaveBeenCalledTimes(1);
                expect(res.json).toHaveBeenCalledWith(encodeError(null, ERROR_DATABASE.code, ERROR_DATABASE.message, {details: 'Mongo Error'}));
            }
        );
    }
);

describe(
    'Topic route deleteAllUsersFromTopics',
    () => {
        let db,
            targetCollection,
            targetModel;
        const res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis()
        };

        beforeAll(
            async () => {
                config.mongodb.dbname = 'notifier-test-topic-admin-deleteAllUsersFromTopics';
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
            'return APPID error when no receive appId',
            async () => {
                const appId = undefined;
                const topics = ['topic1'];
                const Headers = {'X-App-Id': appId};
                const req = {
                    get: (header) => Headers[header],
                    body: { topics }
                };

                await deleteAllUsersFromTopics(targetModel)(req, res);

                expect(res.status).toHaveBeenCalledTimes(1);
                expect(res.status).toHaveBeenCalledWith(400);
                expect(res.json).toHaveBeenCalledTimes(1);
                expect(res.json).toHaveBeenCalledWith(encodeError(ERROR_APP_ID));
            }
        );

        it(
            'return NO TOPIC error when no receive topics',
            async () => {
                const appId = 'testingAppId';
                const topics = undefined;
                const Headers = {'X-App-Id': appId};
                const req = {
                    get: (header) => Headers[header],
                    body: { topics }
                };

                await deleteAllUsersFromTopics(targetModel)(req, res);

                expect(res.status).toHaveBeenCalledTimes(1);
                expect(res.status).toHaveBeenCalledWith(400);
                expect(res.json).toHaveBeenCalledTimes(1);
                expect(res.json).toHaveBeenCalledWith(
                    encodeError(null, ERROR_BODY_PARAMS_MISSING.code, ERROR_BODY_PARAMS_MISSING.message, {params: ['topics']})
                );
            }
        );

        it(
            'return DATABASE error when mongo fails',
            async () => {
                const appId = 'testingAppId';
                const topics = ['topic1'];
                const Headers = {'X-App-Id': appId};
                const req = {
                    get: (header) => Headers[header],
                    body: { topics }
                };
                const fakeMongoCollection = { updateMany: jest.fn().mockRejectedValue(new Error('Mongo Error')) };
                const fakeTargetModel = targetsFactory(fakeMongoCollection);

                await deleteAllUsersFromTopics(fakeTargetModel)(req, res);

                expect(res.status).toHaveBeenCalledTimes(1);
                expect(res.status).toHaveBeenCalledWith(400);
                expect(res.json).toHaveBeenCalledTimes(1);
                expect(res.json).toHaveBeenCalledWith(encodeError(null, ERROR_DATABASE.code, ERROR_DATABASE.message, {details: 'Mongo Error'}));
            }
        );

        it(
            'delete all users from a list of topics',
            async () => {
                const appId = 'testingAppId';
                const userIdTest1 = 'testingUserId1';
                const undeletedTopic = 'undeleted';
                const savedTopicsUser1 = ['topic1', 'topic2', undeletedTopic];
                const userIdTest2 = 'testingUserId2';
                const savedTopicsUser2 = ['topic1', 'topic2', undeletedTopic];
                const topicsToDelete = ['topic1', 'topic2'];
                const Headers = {'X-App-Id': appId};
                const req = {
                    get: (header) => Headers[header],
                    body: { topics: topicsToDelete }
                };
                await targetCollection.insertOne(createFakeUser(userIdTest1, appId, savedTopicsUser1));
                await targetCollection.insertOne(createFakeUser(userIdTest2, appId, savedTopicsUser2));

                await deleteAllUsersFromTopics(targetModel)(req, res);

                const expectedTopicsTest1 = await targetCollection.findOne({_id: `${userIdTest1}-${appId}`});
                const expectedTopicsTest2 = await targetCollection.findOne({_id: `${userIdTest2}-${appId}`});

                expect(res.status).toHaveBeenCalledTimes(1);
                expect(res.status).toHaveBeenCalledWith(200);
                expect(res.json).toHaveBeenCalledTimes(1);
                expect(res.json).toHaveBeenCalledWith({topics: topicsToDelete});
                expect(expectedTopicsTest1.topics.length).toBe(1);
                expect(expectedTopicsTest1.topics[0]).toBe(undeletedTopic);
                expect(expectedTopicsTest2.topics.length).toBe(1);
                expect(expectedTopicsTest2.topics[0]).toBe(undeletedTopic);
            }
        );

        it(
            'delete all users from a topic',
            async () => {
                const appId = 'testingAppId';
                const userIdTest1 = 'testingUserId1';
                const undeletedTopic = 'undeleted';
                const savedTopicsUser1 = ['topic1', undeletedTopic];
                const userIdTest2 = 'testingUserId2';
                const savedTopicsUser2 = ['topic1', undeletedTopic];
                const topicsToDelete = 'topic1';
                const Headers = {'X-App-Id': appId};
                const req = {
                    get: (header) => Headers[header],
                    body: { topics: topicsToDelete }
                };
                await targetCollection.insertOne(createFakeUser(userIdTest1, appId, savedTopicsUser1));
                await targetCollection.insertOne(createFakeUser(userIdTest2, appId, savedTopicsUser2));

                await deleteAllUsersFromTopics(targetModel)(req, res);

                const expectedTopicsTest1 = await targetCollection.findOne({_id: `${userIdTest1}-${appId}`});
                const expectedTopicsTest2 = await targetCollection.findOne({_id: `${userIdTest2}-${appId}`});

                expect(res.status).toHaveBeenCalledTimes(1);
                expect(res.status).toHaveBeenCalledWith(200);
                expect(res.json).toHaveBeenCalledTimes(1);
                expect(res.json).toHaveBeenCalledWith({topics: topicsToDelete});
                expect(expectedTopicsTest1.topics.length).toBe(1);
                expect(expectedTopicsTest1.topics[0]).toBe(undeletedTopic);
                expect(expectedTopicsTest2.topics.length).toBe(1);
                expect(expectedTopicsTest2.topics[0]).toBe(undeletedTopic);
            }
        );

        it(
            'not fails when topics do not exists',
            async () => {
                const appId = 'testingAppId';
                const userIdTest1 = 'testingUserId1';
                const savedTopicsUser1 = ['topic1', 'topic2'];
                const userIdTest2 = 'testingUserId2';
                const savedTopicsUser2 = ['topic1', 'topic2'];
                const topicsToDelete = ['topic3', 'topic4'];
                const Headers = {'X-App-Id': appId};
                const req = {
                    get: (header) => Headers[header],
                    body: { topics: topicsToDelete }
                };
                await targetCollection.insertOne(createFakeUser(userIdTest1, appId, savedTopicsUser1));
                await targetCollection.insertOne(createFakeUser(userIdTest2, appId, savedTopicsUser2));

                await deleteAllUsersFromTopics(targetModel)(req, res);

                const expectedTopicsTest1 = await targetCollection.findOne({_id: `${userIdTest1}-${appId}`});
                const expectedTopicsTest2 = await targetCollection.findOne({_id: `${userIdTest2}-${appId}`});

                expect(res.status).toHaveBeenCalledTimes(1);
                expect(res.status).toHaveBeenCalledWith(200);
                expect(res.json).toHaveBeenCalledTimes(1);
                expect(res.json).toHaveBeenCalledWith({topics: topicsToDelete});
                expect(expectedTopicsTest1.topics.length).toBe(2);
                expect(expectedTopicsTest1.topics).toEqual(expect.arrayContaining(savedTopicsUser1));
                expect(expectedTopicsTest2.topics.length).toBe(2);
                expect(expectedTopicsTest2.topics).toEqual(expect.arrayContaining(savedTopicsUser2));
            }
        );

        it(
            'not fails when a topic do not exists',
            async () => {
                const appId = 'testingAppId';
                const userIdTest1 = 'testingUserId1';
                const savedTopicsUser1 = ['topic1', 'topic2'];
                const userIdTest2 = 'testingUserId2';
                const savedTopicsUser2 = ['topic1', 'topic2'];
                const topicsToDelete = 'topic3';
                const Headers = {'X-App-Id': appId};
                const req = {
                    get: (header) => Headers[header],
                    body: { topics: topicsToDelete }
                };
                await targetCollection.insertOne(createFakeUser(userIdTest1, appId, savedTopicsUser1));
                await targetCollection.insertOne(createFakeUser(userIdTest2, appId, savedTopicsUser2));

                await deleteAllUsersFromTopics(targetModel)(req, res);

                const expectedTopicsTest1 = await targetCollection.findOne({_id: `${userIdTest1}-${appId}`});
                const expectedTopicsTest2 = await targetCollection.findOne({_id: `${userIdTest2}-${appId}`});

                expect(res.status).toHaveBeenCalledTimes(1);
                expect(res.status).toHaveBeenCalledWith(200);
                expect(res.json).toHaveBeenCalledTimes(1);
                expect(res.json).toHaveBeenCalledWith({topics: topicsToDelete});
                expect(expectedTopicsTest1.topics.length).toBe(2);
                expect(expectedTopicsTest1.topics).toEqual(expect.arrayContaining(savedTopicsUser1));
                expect(expectedTopicsTest2.topics.length).toBe(2);
                expect(expectedTopicsTest2.topics).toEqual(expect.arrayContaining(savedTopicsUser2));
            }
        );
    }
);

describe(
    'Topic route deleteUserFromTopics',
    () => {
        let db,
            targetCollection,
            targetModel;
        const res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis()
        };

        beforeAll(
            async () => {
                config.mongodb.dbname = 'notifier-test-topic-admin-deleteTopics';
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
            'return APPID error when no receive appId',
            async () => {
                const appId = undefined;
                const userId = 'testingUser';
                const topics = ['topic1'];
                const Headers = {'X-App-Id': appId};
                const req = {
                    params: { userId },
                    get: (header) => Headers[header],
                    body: { topics }
                };

                await deleteUserFromTopics(targetModel)(req, res);

                expect(res.status).toHaveBeenCalledTimes(1);
                expect(res.status).toHaveBeenCalledWith(400);
                expect(res.json).toHaveBeenCalledTimes(1);
                expect(res.json).toHaveBeenCalledWith(encodeError(ERROR_APP_ID));
            }
        );

        it(
            'return USERID ERROR error when no receive user',
            async () => {
                const appId = 'testingAppId';
                const userId = undefined;
                const topics = 'topic1';
                const Headers = {'X-App-Id': appId};
                const req = {
                    params: { userId },
                    get: (header) => Headers[header],
                    body: { topics }
                };

                await deleteUserFromTopics(targetModel)(req, res);

                expect(res.status).toHaveBeenCalledTimes(1);
                expect(res.status).toHaveBeenCalledWith(400);
                expect(res.json).toHaveBeenCalledTimes(1);
                expect(res.json).toHaveBeenCalledWith(encodeError(ERROR_USER_ID));
            }
        );

        it(
            'return NO TOPIC error when no receive topics',
            async () => {
                const appId = 'testingAppId';
                const userId = 'testingUserId';
                const topics = undefined;
                const Headers = {'X-App-Id': appId};
                const req = {
                    params: { userId },
                    get: (header) => Headers[header],
                    body: { topics }
                };

                await deleteUserFromTopics(targetModel)(req, res);

                expect(res.status).toHaveBeenCalledTimes(1);
                expect(res.status).toHaveBeenCalledWith(400);
                expect(res.json).toHaveBeenCalledTimes(1);
                expect(res.json).toHaveBeenCalledWith(
                    encodeError(null, ERROR_BODY_PARAMS_MISSING.code, ERROR_BODY_PARAMS_MISSING.message, {params: ['topics']})
                );
            }
        );

        it(
            'return DATABASE error when mongo fails',
            async () => {
                const appId = 'testingAppId';
                const userId = 'testingUserId';
                const topics = ['topic1'];
                const Headers = {'X-App-Id': appId};
                const req = {
                    params: { userId },
                    get: (header) => Headers[header],
                    body: { topics }
                };
                const fakeMongoCollection = { updateMany: jest.fn().mockRejectedValue(new Error('Mongo Error')) };
                const fakeTargetModel = targetsFactory(fakeMongoCollection);

                await deleteUserFromTopics(fakeTargetModel)(req, res);

                expect(res.status).toHaveBeenCalledTimes(1);
                expect(res.status).toHaveBeenCalledWith(400);
                expect(res.json).toHaveBeenCalledTimes(1);
                expect(res.json).toHaveBeenCalledWith(encodeError(null, ERROR_DATABASE.code, ERROR_DATABASE.message, {details: 'Mongo Error'}));
            }
        );

        it(
            'delete a user from a list of topics',
            async () => {
                const appId = 'testingAppId';
                const userId = 'testingUserId';
                const undeletedTopic = 'undeleted';
                const savedTopicsUser = ['topic1', 'topic2', undeletedTopic];
                const topicsToDelete = ['topic1', 'topic2'];
                const Headers = {'X-App-Id': appId};
                const req = {
                    params: { userId },
                    get: (header) => Headers[header],
                    body: { topics: topicsToDelete }
                };
                await targetCollection.insertOne(createFakeUser(userId, appId, savedTopicsUser));

                await deleteUserFromTopics(targetModel)(req, res);

                const expectedTopicsTest = await targetCollection.findOne({_id: `${userId}-${appId}`});

                expect(res.status).toHaveBeenCalledTimes(1);
                expect(res.status).toHaveBeenCalledWith(200);
                expect(res.json).toHaveBeenCalledTimes(1);
                expect(res.json).toHaveBeenCalledWith({topics: topicsToDelete});
                expect(expectedTopicsTest.topics.length).toBe(1);
                expect(expectedTopicsTest.topics[0]).toBe(undeletedTopic);
            }
        );

        it(
            'delete a user from a topic',
            async () => {
                const appId = 'testingAppId';
                const userId = 'testingUserId';
                const undeletedTopic = 'undeleted';
                const savedTopicsUser = ['topic1', undeletedTopic];
                const topicsToDelete = 'topic1';
                const Headers = {'X-App-Id': appId};
                const req = {
                    params: { userId },
                    get: (header) => Headers[header],
                    body: { topics: topicsToDelete }
                };
                await targetCollection.insertOne(createFakeUser(userId, appId, savedTopicsUser));

                await deleteUserFromTopics(targetModel)(req, res);

                const expectedTopicsTest = await targetCollection.findOne({_id: `${userId}-${appId}`});

                expect(res.status).toHaveBeenCalledTimes(1);
                expect(res.status).toHaveBeenCalledWith(200);
                expect(res.json).toHaveBeenCalledTimes(1);
                expect(res.json).toHaveBeenCalledWith({topics: topicsToDelete});
                expect(expectedTopicsTest.topics.length).toBe(1);
                expect(expectedTopicsTest.topics[0]).toBe(undeletedTopic);
            }
        );

        it(
            'no fails when user has not the list of topics',
            async () => {
                const appId = 'testingAppId';
                const userId = 'testingUserId';
                const savedTopicsUser = ['topic1', 'topic2'];
                const topicsToDelete = ['topic3', 'topic4'];
                const Headers = {'X-App-Id': appId};
                const req = {
                    params: { userId },
                    get: (header) => Headers[header],
                    body: { topics: topicsToDelete }
                };
                await targetCollection.insertOne(createFakeUser(userId, appId, savedTopicsUser));

                await deleteUserFromTopics(targetModel)(req, res);

                const expectedTopicsTest = await targetCollection.findOne({_id: `${userId}-${appId}`});

                expect(res.status).toHaveBeenCalledTimes(1);
                expect(res.status).toHaveBeenCalledWith(200);
                expect(res.json).toHaveBeenCalledTimes(1);
                expect(res.json).toHaveBeenCalledWith({topics: topicsToDelete});
                expect(expectedTopicsTest.topics.length).toBe(2);
                expect(expectedTopicsTest.topics).toEqual(expect.arrayContaining(savedTopicsUser));
            }
        );

        it(
            'no fails when user has not the topic',
            async () => {
                const appId = 'testingAppId';
                const userId = 'testingUserId';
                const savedTopicsUser = ['topic1', 'topic2'];
                const topicsToDelete = 'topic3';
                const Headers = {'X-App-Id': appId};
                const req = {
                    params: { userId },
                    get: (header) => Headers[header],
                    body: { topics: topicsToDelete }
                };
                await targetCollection.insertOne(createFakeUser(userId, appId, savedTopicsUser));

                await deleteUserFromTopics(targetModel)(req, res);

                const expectedTopicsTest = await targetCollection.findOne({_id: `${userId}-${appId}`});

                expect(res.status).toHaveBeenCalledTimes(1);
                expect(res.status).toHaveBeenCalledWith(200);
                expect(res.json).toHaveBeenCalledTimes(1);
                expect(res.json).toHaveBeenCalledWith({topics: topicsToDelete});
                expect(expectedTopicsTest.topics.length).toBe(2);
                expect(expectedTopicsTest.topics).toEqual(expect.arrayContaining(savedTopicsUser));
            }
        );

        it(
            'delete the topics where is registered',
            async () => {
                const appId = 'testingAppId';
                const userId = 'testingUserId';
                const savedTopicsUser = ['topic1', 'topic2'];
                const topicsToDelete = ['topic2', 'topic3'];
                const Headers = {'X-App-Id': appId};
                const req = {
                    params: { userId },
                    get: (header) => Headers[header],
                    body: { topics: topicsToDelete }
                };
                await targetCollection.insertOne(createFakeUser(userId, appId, savedTopicsUser));

                await deleteUserFromTopics(targetModel)(req, res);

                const expectedTopicsTest = await targetCollection.findOne({_id: `${userId}-${appId}`});

                expect(res.status).toHaveBeenCalledTimes(1);
                expect(res.status).toHaveBeenCalledWith(200);
                expect(res.json).toHaveBeenCalledTimes(1);
                expect(res.json).toHaveBeenCalledWith({topics: topicsToDelete});
                expect(expectedTopicsTest.topics.length).toBe(1);
                expect(expectedTopicsTest.topics[0]).toEqual('topic1');
            }
        );
    }
);
