import {
    startDatabase
} from '../src/database';
import app from '../src/app';

describe(
    'App should',
    () => {
        let db, mongoClient, fcm;
        beforeAll(
            async () => {
                ({db, mongoClient} = await startDatabase());
            }
        );
        afterAll(
            async () => {
                await mongoClient.close();
            }
        );
        beforeEach(
            async () => {
                await db.dropDatabase();
                fcm = {};
                jest.clearAllMocks();
            }
        );
        it(
            'should load express and its middleware',
            async () => {
                const fcm = {};

                const {server, app: appInstance} = await app(db, fcm);
                const middleware = appInstance._router.stack;

                expect(server).toBeTruthy();
                expect(server.address()).toEqual({address: '::', family: 'IPv6', port: 30701});
                expect(middleware.length).toBe(8);
                expect(middleware[0].name).toBe('query');
                expect(middleware[1].name).toBe('expressInit');
                expect(middleware[2].name).toBe('jsonParser');
                expect(middleware[3].name).toBe('result');
                middleware.slice(4).forEach(layer => expect(layer.name).toBe('router'));
                expect(middleware[4].regexp.test('/register')).toBe(true);
                expect(middleware[5].regexp.test('/notify')).toBe(true);
                expect(middleware[6].regexp.test('/topics')).toBe(true);
                expect(middleware[7].regexp.test('/admin')).toBe(true);

                await new Promise((resolve) => {
                    server.close(resolve);
                });
            }
        );
    }
);
