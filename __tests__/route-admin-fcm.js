import {
    startDatabase,
    FCMAPPS_COLLECTION
} from '../src/database';
import {
    setFCMToAppId,
    unsetFCMToAppId,
    statusFCMFromAppId
} from '../src/routes/admin';
import config from '../src/config';
import { encodeError } from '../src/utils/error-encoder';
import {
    ERROR_APP_ID,
    ERROR_FCM_CREDENTIAL_INVALID_FILE,
    ERROR_FCM_INIT,
    ERROR_DATABASE
} from '../src/constants/errors';
import fs from 'fs';
import * as fcm from 'firebase-admin';

const fakeFile = {
    fieldname: 'credentials',
    originalname: 'credentials.json',
    encoding: '7bit',
    mimetype: 'application/json',
    destination: 'uploads/',
    filename: '7f1bc52bfdf8920560dc454e98461177',
    path: 'uploads/7f1bc52bfdf8920560dc454e98461177',
    size: 673
};
const fakeFileContent = `{
"type": "service_account",
"project_id": "pingit-df437",
"private_key_id": "d15f04d23b6c4f14d9989d915299d4e1397cae2d",
"private_key": "-----BEGIN PRIVATE KEY-----\\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCrFiIAuq2DerxO\\nAEQWpbbysqE4ceFJcwpJwyq5EgS7olcVX6UC6fFWofSxN3/+fiSzivGTTnQ6NNYk\\nksxg470PTdi1miE3RP/TJqW6CXMOq7ztwu8eUaav6e+T9hMBNmG41sIF/Jqa8taX\\ncEqZchVpKj9NjEc+cFJosVCyIPpNubiLoBNOzHdkfvQ+T2hTTiCJJWFhTXqm96wH\\n9FciRriSk5fIkyZPJ3OUt4VVcLrxe/mN80iK8oicruzDDFqkQZTOfnUHpG6t3CO1\\ndQ5BgHgPVbSmq1acgSzf/ZZX5LqRI+hrxpF5I1qm0KrJGQz+/Dy4SeH/rBKj16ls\\nxCfECQYhAgMBAAECggEAKQSa7WLUU+f6upa8vFNJvAFQvugqs8Hljw7AMPPdd6Dx\\n0PmH5d1x06vrrwtX4AudQACJb6BJJGVjjAw3/OjM/JzU3qFP4mDkFts2s5YtZDCP\\nkM+CJdo8pQNowagnIUzI/BhdFzNbW9fp1BADiqt776VF3RFLSXCDiX8tki9u43BF\\npcaawYlO8YTM80n0krIuBnmKbXUc0KmqkSs4UFgC24jaDi/BngueGGW8kjnnM5b3\\nRgKEfW6dI+9ZGdSKbAxlw2J3cjRRilau6YJMy4nLzj64B2Re4aBT4GJEhKXAIZ/C\\nTBubRx/Wu1dJhMt2EtGBLPIbqEdUzs4gC2VqHP6O2QKBgQDXl8eUUcxKH8IHziuP\\nRzf1H0o8qU0Qdsi4QgDJ4/2EEA2Bs0EZgPPC5oHcccpXq50oD4yKPR+8+SjnGVy8\\nLOSHwoIQMGmzjCmhEmBVDIj6LbGyktHZUydMzJs7FOSh7oA7CD6tEhpYkHCMR7ym\\nl9/iUTyAtu5psRwZp96O1o79BQKBgQDLJutcz9o3DAbtAb/95A0ZW81tMGFJgB2x\\nyDgzmXijYaASXi9PFFrOiWgxNh292DFkbBmOceCq5c17SReSI6umerMaiv/aZRay\\n0/CCAnlY+kZglwx08+y65GbUmGT+JTQEIjTh5+rLqqnpTuDOJoh66mIyzYCqpgcG\\nIrxV90QPbQKBgDd1wQ6jmDT9RHGzlLsP7BIvkW5Xcw6oL+xOdlt5Pe8qHf9eeIGy\\nDYL2vzNRRmcVK6Fxloq9PJvlUKNaf+OcfNF7tO+rNJXOmaroykU2q0oIVS0F3dvV\\nK0fzXn9tWX9aljwZW94zyPk9duZvUdVdPme+1ByccmpX+E2VRIhkI3ZtAoGADvs6\\nxihp3j9bz2SepPmJYcJcXt3/fq0dA3xRcLSzqdDMPi6F7J4CqFKHxYFJJjPoSJCU\\nPeX1/IRf5+SXAWbyBJ/tz1pKze9AgkWQ6fWGv2INiJf7CjDm1016q9jlMbzKnjdr\\nkPFKZmSajSMM/wbmb7ITNc3j3DHMOM6c9vX6Je0CgYEAuN2izIl1ozx704EbCVZi\\nq2yECe4OD2/IYeiIoxOuDDCX09OzlwC2WoOMTeSmGgss1NZBdJNwRewyNDHp1+Kx\\nph/Yni44VLf2uaeVIsnYMFskbg/5o0W9194MFPO7eEdJ1Hw5/JLPtGS0b5BpadML\\nkk4Hxt5tVz3JYA++nwT6RJA=\\n-----END PRIVATE KEY-----\\n",
"client_email": "firebase-adminsdk-kk82j@pingit-df437.iam.gserviceaccount.com",
"client_id": "111754586583333710500",
"auth_uri": "https://accounts.google.com/o/oauth2/auth",
"token_uri": "https://accounts.google.com/o/oauth2/token",
"auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
"client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-kk82j%40pingit-df437.iam.gserviceaccount.com"
}`;

jest.mock('fs');

describe(
    'Admin FCM setFCMtoAppId should',
    () => {
        let db, fcm;//, oldDbName;
        const res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis()
        };

        beforeAll(
            async () => {
                //oldDbName = config.mongodb.dbname;
                config.mongodb.dbname = 'notifier-test-fcm-admin';
                db = await startDatabase();
            }
        );
        afterAll(
            async () => {
                //config.mongodb.dbname = oldDbName;
                db.close();
            }
        );
        beforeEach(
            async () => {
                await db.collection(FCMAPPS_COLLECTION).deleteMany();
                fcm = {};
                jest.clearAllMocks();
            }
        );
        it(
            'save fcm data to mongo when receive a fcm credentials in a file and an appId',
            async () => {
                const appId = 'fakeAppId';
                const req = {
                    params: { appId },
                    file: fakeFile
                };
                const jsonResponse = {
                    appId,
                    fcm: true
                };
                fs.readFile.mockImplementation((path, options, cb) => cb(null, fakeFileContent));
                fs.unlink.mockImplementation((path, cb) => cb(null));

                await setFCMToAppId(db, fcm)(req, res);

                expect(res.status).toHaveBeenCalledTimes(1);
                expect(res.status).toHaveBeenCalledWith(200);
                expect(res.json).toHaveBeenCalledTimes(1);
                expect(res.json).toHaveBeenCalledWith(expect.objectContaining(jsonResponse));
                expect(fs.readFile).toHaveBeenCalledTimes(1);
                expect(fs.readFile).toHaveBeenCalledWith(fakeFile.path, 'utf8', expect.any(Function));
                expect(fs.unlink).toHaveBeenCalledTimes(1);
                expect(fs.unlink).toHaveBeenCalledWith(fakeFile.path, expect.any(Function));

                const fcmSaved = await db.collection(FCMAPPS_COLLECTION).find({appId}).toArray();
                expect(fcmSaved.length).toBe(1);
                expect(fcmSaved[0].credential).toBeTruthy();
                expect(fcm[appId]).toBeTruthy();
                expect(fcm[appId]).toStrictEqual(expect.any(Object));
            }
        );

        it(
            'response an error when receive a invalid file content',
            async () => {
                const appId = 'fakeAppId';
                const req = {
                    params: { appId },
                    file: fakeFile
                };
                const jsonResponse = encodeError(null, ERROR_FCM_CREDENTIAL_INVALID_FILE);
                fs.readFile.mockImplementation((path, options, cb) => cb(null, 'fakeFileContent'));
                fs.unlink.mockImplementation((path, cb) => cb(null));

                await setFCMToAppId(db, fcm)(req, res);

                expect(res.status).toHaveBeenCalledTimes(1);
                expect(res.status).toHaveBeenCalledWith(400);
                expect(res.json).toHaveBeenCalledTimes(1);
                expect(res.json).toHaveBeenCalledWith(expect.objectContaining(jsonResponse));
                expect(fs.readFile).toHaveBeenCalledTimes(1);
                expect(fs.readFile).toHaveBeenCalledWith(fakeFile.path, 'utf8', expect.any(Function));
                expect(fs.unlink).toHaveBeenCalledTimes(1);
                expect(fs.unlink).toHaveBeenCalledWith(fakeFile.path, expect.any(Function));

                const fcmSaved = await db.collection(FCMAPPS_COLLECTION).find({appId}).toArray();
                expect(fcmSaved.length).toBe(0);
                expect(fcm[appId]).toBe(undefined);
            }
        );

        it(
            'response an error when do not receive file',
            async () => {
                const appId = 'fakeAppId';
                const req = {
                    params: { appId }
                };
                const jsonResponse = encodeError(null, ERROR_FCM_CREDENTIAL_INVALID_FILE);
                fs.readFile.mockImplementation((path, options, cb) => cb(null, 'fakeFileContent'));
                fs.unlink.mockImplementation((path, cb) => cb(null));

                await setFCMToAppId(db, fcm)(req, res);

                expect(res.status).toHaveBeenCalledTimes(1);
                expect(res.status).toHaveBeenCalledWith(400);
                expect(res.json).toHaveBeenCalledTimes(1);
                expect(res.json).toHaveBeenCalledWith(expect.objectContaining(jsonResponse));
                expect(fs.readFile).toHaveBeenCalledTimes(0);
                expect(fs.unlink).toHaveBeenCalledTimes(0);

                const fcmSaved = await db.collection(FCMAPPS_COLLECTION).find({appId}).toArray();
                expect(fcmSaved.length).toBe(0);
                expect(fcm[appId]).toBe(undefined);
            }
        );

        it(
            'response an error when do not receive appId',
            async () => {
                const appId = 'fakeAppId';
                const req = {};
                const jsonResponse = encodeError(null, ERROR_APP_ID);
                fs.readFile.mockImplementation((path, options, cb) => cb(null, 'fakeFileContent'));
                fs.unlink.mockImplementation((path, cb) => cb(null));

                await setFCMToAppId(db, fcm)(req, res);

                expect(res.status).toHaveBeenCalledTimes(1);
                expect(res.status).toHaveBeenCalledWith(400);
                expect(res.json).toHaveBeenCalledTimes(1);
                expect(res.json).toHaveBeenCalledWith(expect.objectContaining(jsonResponse));
                expect(fs.readFile).toHaveBeenCalledTimes(0);
                expect(fs.unlink).toHaveBeenCalledTimes(0);

                const fcmSaved = await db.collection(FCMAPPS_COLLECTION).find({appId}).toArray();
                expect(fcmSaved.length).toBe(0);
                expect(fcm[appId]).toBe(undefined);
            }
        );

        it(
            'response an error when mongo fails',
            async () => {
                const appId = 'fakeAppId';
                const req = {
                    params: { appId },
                    file: fakeFile
                };
                const jsonResponse = encodeError(null, ERROR_DATABASE.code, ERROR_DATABASE.message, {details: 'Mongo Error'});
                fs.readFile.mockImplementation((path, options, cb) => cb(null, fakeFileContent));
                fs.unlink.mockImplementation((path, cb) => cb(null));
                const fakeMongo = {collection: () => ({ replaceOne: jest.fn().mockRejectedValue(new Error('Mongo Error'))})};

                await setFCMToAppId(fakeMongo, fcm)(req, res);

                expect(res.status).toHaveBeenCalledTimes(1);
                expect(res.status).toHaveBeenCalledWith(400);
                expect(res.json).toHaveBeenCalledTimes(1);
                expect(res.json).toHaveBeenCalledWith(expect.objectContaining(jsonResponse));
                expect(fs.readFile).toHaveBeenCalledTimes(1);
                expect(fs.readFile).toHaveBeenCalledWith(fakeFile.path, 'utf8', expect.any(Function));
                expect(fs.unlink).toHaveBeenCalledTimes(1);
                expect(fs.unlink).toHaveBeenCalledWith(fakeFile.path, expect.any(Function));

                const fcmSaved = await db.collection(FCMAPPS_COLLECTION).find({appId}).toArray();
                expect(fcmSaved.length).toBe(0);
                expect(fcm[appId]).toBe(undefined);
            }
        );

        it(
            'not fails when unlink fails',
            async () => {
                const appId = 'fakeAppId2';
                const req = {
                    params: { appId },
                    file: fakeFile
                };
                const jsonResponse = {appId, fcm: true};
                fs.readFile.mockImplementation((path, options, cb) => cb(null, fakeFileContent));
                fs.unlink.mockImplementation((path, cb) => cb(new Error('Permisison denied')));

                await setFCMToAppId(db, fcm)(req, res);

                expect(res.status).toHaveBeenCalledTimes(1);
                expect(res.status).toHaveBeenCalledWith(200);
                expect(res.json).toHaveBeenCalledTimes(1);
                expect(res.json).toHaveBeenCalledWith(expect.objectContaining(jsonResponse));
                expect(fs.readFile).toHaveBeenCalledTimes(1);
                expect(fs.readFile).toHaveBeenCalledWith(fakeFile.path, 'utf8', expect.any(Function));
                expect(fs.unlink).toHaveBeenCalledTimes(1);
                expect(fs.unlink).toHaveBeenCalledWith(fakeFile.path, expect.any(Function));

                const fcmSaved = await db.collection(FCMAPPS_COLLECTION).find({appId}).toArray();
                expect(fcmSaved.length).toBe(1);
                expect(fcmSaved[0].credential).toBeTruthy();
                expect(fcm[appId]).toBeTruthy();
                expect(fcm[appId]).toStrictEqual(expect.any(Object));
            }
        );

        it(
            'fails when initApp fails',
            async () => {
                const appId = 'fakeAppId2';
                const req = {
                    params: { appId },
                    file: fakeFile
                };
                const jsonResponse = {appId, fcm: true};
                fs.readFile.mockImplementation((path, options, cb) => cb(null, fakeFileContent));
                fs.unlink.mockImplementation((path, cb) => cb(null));

                await setFCMToAppId(db, fcm)(req, res);

                expect(res.status).toHaveBeenCalledTimes(1);
                expect(res.status).toHaveBeenCalledWith(400);
                expect(res.json).toHaveBeenCalledTimes(1);
                expect(res.json).toHaveBeenCalledWith(expect.objectContaining(
                    encodeError(null, ERROR_FCM_INIT.code, ERROR_FCM_INIT.message, {details: expect.any(String)})
                ));
                expect(fs.readFile).toHaveBeenCalledTimes(1);
                expect(fs.readFile).toHaveBeenCalledWith(fakeFile.path, 'utf8', expect.any(Function));
                expect(fs.unlink).toHaveBeenCalledTimes(1);
                expect(fs.unlink).toHaveBeenCalledWith(fakeFile.path, expect.any(Function));

                const fcmSaved = await db.collection(FCMAPPS_COLLECTION).find({appId}).toArray();
                expect(fcmSaved.length).toBe(1);
                expect(fcmSaved[0].credential).toBeTruthy();
                expect(fcm[appId]).toBeFalsy();
            }
        );
    }
);

describe(
    'Admin FCM unsetFCMtoAppId should',
    () => {
        let db, fcm;
        const res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis()
        };

        beforeAll(
            async () => {
                db = await startDatabase();
            }
        );
        afterAll(
            async () => {
                db.close();
            }
        );
        beforeEach(
            async () => {
                await db.collection(FCMAPPS_COLLECTION).deleteMany();
                fcm = {};
                jest.clearAllMocks();
            }
        );
        it(
            'delete an existing fcm data from mongo',
            async () => {
                const appId = 'fakeAppId';
                const req = {
                    params: { appId }
                };
                const jsonResponse = {
                    appId,
                    fcm: false
                };
                await db.collection(FCMAPPS_COLLECTION).insertOne({appId, credential: {}});
                fcm = {[appId]: {}};

                await unsetFCMToAppId(db, fcm)(req, res);

                expect(res.status).toHaveBeenCalledTimes(1);
                expect(res.status).toHaveBeenCalledWith(200);
                expect(res.json).toHaveBeenCalledTimes(1);
                expect(res.json).toHaveBeenCalledWith(expect.objectContaining(jsonResponse));

                const fcmSaved = await db.collection(FCMAPPS_COLLECTION).find({appId}).toArray();
                expect(fcmSaved.length).toBe(0);
                expect(fcm[appId]).toBe(undefined);
            }
        );

        it(
            'delete an NON existing fcm data from mongo',
            async () => {
                const appId = 'fakeAppId';
                const req = {
                    params: { appId }
                };
                const jsonResponse = {
                    appId,
                    fcm: false
                };

                await unsetFCMToAppId(db, fcm)(req, res);

                expect(res.status).toHaveBeenCalledTimes(1);
                expect(res.status).toHaveBeenCalledWith(200);
                expect(res.json).toHaveBeenCalledTimes(1);
                expect(res.json).toHaveBeenCalledWith(expect.objectContaining(jsonResponse));

                const fcmSaved = await db.collection(FCMAPPS_COLLECTION).find({appId}).toArray();
                expect(fcmSaved.length).toBe(0);
                expect(fcm[appId]).toBe(undefined);
            }
        );

        it(
            'fails when no receive an appId',
            async () => {
                const appId = 'fakeAppId';
                const req = {};
                const jsonResponse = encodeError(null, ERROR_APP_ID);
                await db.collection(FCMAPPS_COLLECTION).deleteMany();
                fcm = {};

                await unsetFCMToAppId(db, fcm)(req, res);

                expect(res.status).toHaveBeenCalledTimes(1);
                expect(res.status).toHaveBeenCalledWith(400);
                expect(res.json).toHaveBeenCalledTimes(1);
                expect(res.json).toHaveBeenCalledWith(expect.objectContaining(jsonResponse));

                const fcmSaved = await db.collection(FCMAPPS_COLLECTION).find({appId}).toArray();
                expect(fcmSaved.length).toBe(0);
                expect(fcm[appId]).toBe(undefined);
            }
        );

        it(
            'response an error when mongo fails',
            async () => {
                const appId = 'fakeAppId';
                const req = {
                    params: { appId }
                };
                const jsonResponse = encodeError(null, ERROR_DATABASE.code, ERROR_DATABASE.message, {details: 'Mongo Error'});
                const fakeMongo = {collection: () => ({ deleteOne: jest.fn().mockRejectedValue(new Error('Mongo Error'))})};

                await unsetFCMToAppId(fakeMongo, fcm)(req, res);

                expect(res.status).toHaveBeenCalledTimes(1);
                expect(res.status).toHaveBeenCalledWith(400);
                expect(res.json).toHaveBeenCalledTimes(1);
                expect(res.json).toHaveBeenCalledWith(expect.objectContaining(jsonResponse));

                const fcmSaved = await db.collection(FCMAPPS_COLLECTION).find({appId}).toArray();
                expect(fcmSaved.length).toBe(0);
                expect(fcm[appId]).toBe(undefined);
            }
        );
    }
);

describe(
    'Admin FCM statusFCMFromAppId should',
    () => {
        let db, fcm;
        const res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis()
        };

        beforeAll(
            async () => {
                db = await startDatabase();
            }
        );
        afterAll(
            async () => {
                db.close();
            }
        );
        beforeEach(
            async () => {
                await db.collection(FCMAPPS_COLLECTION).deleteMany();
                fcm = {};
                jest.clearAllMocks();
            }
        );
        it(
            'show an existing fcm data from mongo',
            async () => {
                const appId = 'fakeAppId';
                const req = {
                    params: { appId }
                };
                const jsonResponse = {
                    appId,
                    fcm: true,
                    stored: true
                };
                await db.collection(FCMAPPS_COLLECTION).insertOne({appId, credential: {}});
                fcm = {[appId]: {}};

                await statusFCMFromAppId(db, fcm)(req, res);

                expect(res.status).toHaveBeenCalledTimes(1);
                expect(res.status).toHaveBeenCalledWith(200);
                expect(res.json).toHaveBeenCalledTimes(1);
                expect(res.json).toHaveBeenCalledWith(expect.objectContaining(jsonResponse));
            }
        );

        it(
            'show an NON existing fcm data from mongo',
            async () => {
                const appId = 'fakeAppId';
                const req = {
                    params: { appId }
                };
                const jsonResponse = {
                    appId,
                    fcm: false
                };

                await statusFCMFromAppId(db, fcm)(req, res);

                expect(res.status).toHaveBeenCalledTimes(1);
                expect(res.status).toHaveBeenCalledWith(200);
                expect(res.json).toHaveBeenCalledTimes(1);
                expect(res.json).toHaveBeenCalledWith(expect.objectContaining(jsonResponse));

                const fcmSaved = await db.collection(FCMAPPS_COLLECTION).find({appId}).toArray();
                expect(fcmSaved.length).toBe(0);
                expect(fcm[appId]).toBe(undefined);
            }
        );

        it(
            'fails when no receive an appId',
            async () => {
                const appId = 'fakeAppId';
                const req = {};
                const jsonResponse = encodeError(null, ERROR_APP_ID);
                await db.collection(FCMAPPS_COLLECTION).deleteMany();
                fcm = {};

                await statusFCMFromAppId(db, fcm)(req, res);

                expect(res.status).toHaveBeenCalledTimes(1);
                expect(res.status).toHaveBeenCalledWith(400);
                expect(res.json).toHaveBeenCalledTimes(1);
                expect(res.json).toHaveBeenCalledWith(expect.objectContaining(jsonResponse));
            }
        );

        it(
            'response an error when mongo fails',
            async () => {
                const appId = 'fakeAppId';
                const req = {
                    params: { appId }
                };
                const jsonResponse = encodeError(null, ERROR_DATABASE.code, ERROR_DATABASE.message, {details: 'Mongo Error'});
                const fakeMongo = { collection: () => ({ find: () => ({ toArray: jest.fn().mockRejectedValue(new Error('Mongo Error'))})})};

                await statusFCMFromAppId(fakeMongo, fcm)(req, res);

                expect(res.status).toHaveBeenCalledTimes(1);
                expect(res.status).toHaveBeenCalledWith(400);
                expect(res.json).toHaveBeenCalledTimes(1);
                expect(res.json).toHaveBeenCalledWith(expect.objectContaining(jsonResponse));

                const fcmSaved = await db.collection(FCMAPPS_COLLECTION).find({appId}).toArray();
                expect(fcmSaved.length).toBe(0);
                expect(fcm[appId]).toBe(undefined);
            }
        );
    }
);
