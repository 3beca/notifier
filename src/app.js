import express from 'express';
import config from './config';
import auth from '@tribeca/auth-middleware';
import { TARGETS_COLLECTION } from './database';
import Register from './routes/register';
import Notify from './routes/notify';
import Topics from './routes/topics';
import Admin from './routes/admin';

export default (db, fcm) => {
    const app = express();

    // Parse body query to JSON
    app.use(express.json());

    app.use(auth().unless({ path: ['/admin/check-health'] }));

    // routes
    app.use('/register', Register(db.collection(TARGETS_COLLECTION)));
    app.use('/notify', Notify(fcm, db.collection(TARGETS_COLLECTION)));
    app.use('/topics', Topics(db.collection(TARGETS_COLLECTION)));
    app.use('/admin', Admin(db, fcm));

    return new Promise((resolve, reject) => {
        const server = app.listen(config.http.port,
            function started(error) {
                if (error) {
                    return void reject(error);
                }
                console.log('Express started on:', server.address());
                return void resolve({server, app});
            }
        );
    });
};
