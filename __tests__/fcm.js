import * as fcm from 'firebase-admin';
import {
    startDatabase,
    FCMAPPS_COLLECTION
} from '../src/database';
import { loadFCM } from '../src/fcm';
import config from '../src/config';

jest.mock('firebase-admin');

describe(
    'FCM module should',
    () => {
        let db, oldDbName;
        beforeAll(
            async () => {
                oldDbName = config.mongodb.dbname;
                config.mongodb.dbname = 'notifier-test-fcm';
                db = await startDatabase();
            }
        );
        afterAll(
            async () => {
                config.mongodb.dbname = oldDbName;
                db.close();
            }
        );
        beforeEach(
            async () => {
                await db.collection(FCMAPPS_COLLECTION).deleteMany();
                jest.clearAllMocks();
            }
        );

        it(
            'load and initialize a fcmApp found in mongo',
            async () => {
                const fcmConfigApps = {appId: 'appId1', credential: {}};
                const fcmAppsExpected = {appId1: {appId: 'appId1', credential: {}}};
                await db.collection(FCMAPPS_COLLECTION).insertOne(fcmConfigApps);
                fcm.initializeApp = jest.fn().mockImplementation((credential, appId) => ({...credential, appId}));
                fcm.credential.cert = jest.fn().mockImplementation(cred => cred);

                const fcmApps = await loadFCM(db);

                expect(fcmApps).toEqual(fcmAppsExpected);
            }
        );

        it(
            'load and initialize two fcmApps found in mongo',
            async () => {
                const fcmConfigApps = [{appId: 'appId1', credential: {}}, {appId: 'appId2', credential: {}}];
                const fcmAppsExpected = {appId1: {appId: 'appId1', credential: {}}, appId2: {appId: 'appId2', credential: {}}};
                await db.collection(FCMAPPS_COLLECTION).insertMany(fcmConfigApps);
                fcm.initializeApp = jest.fn().mockImplementation((credential, appId) => ({...credential, appId}));
                fcm.credential.cert = jest.fn().mockImplementation(cred => cred);

                const fcmApps = await loadFCM(db);

                expect(fcmApps).toEqual(fcmAppsExpected);
            }
        );

        it(
            'return and empty object if it do not find fcmApps in mongo',
            async () => {
                const fcmAppsExpected = {};
                fcm.initializeApp = jest.fn().mockImplementation((credential, appId) => ({...credential, appId}));
                fcm.credential.cert = jest.fn().mockImplementation(cred => cred);

                const fcmApps = await loadFCM(db);

                expect(fcmApps).toEqual(fcmAppsExpected);
            }
        );

        it(
            'thorw an error if mongo fails',
            async () => {
                expect.assertions(1);

                const fcmAppsExpected = {};
                fcm.initializeApp = jest.fn().mockImplementation((credential, appId) => ({...credential, appId}));
                fcm.credential.cert = jest.fn().mockImplementation(cred => cred);
                const fakeMongo = { collection: () => ({ find: () => ({ toArray: jest.fn().mockRejectedValue(new Error('Mongo Error'))})})};

                try {
                    await loadFCM(fakeMongo);
                }
                catch (error) {
                    expect(error.message).toEqual('Mongo Error');
                }
            }
        );
    }
);
