import convict from 'convict';

const config = convict({
    env: {
        doc: 'The application environment.',
        format: ['production', 'development', 'test'],
        default: 'development',
        env: 'NODE_ENV'
    },
    http: {
        host: {
            doc: 'The host ip address to bind.',
            format: String,
            default: '127.0.0.1',
            env: 'HTTP_HOST',
        },
        port: {
            doc: 'The port to bind.',
            format: 'port',
            default: 30701,
            env: 'HTTP_PORT',
        }
    },
    mongodb: {
        url: {
            doc: 'mongodb url.',
            format: String,
            default: 'mongodb://localhost:27017',
            env: 'MONGODB_URL',
        },
        dbname: {
            doc: 'mongo database name.',
            format: String,
            default: 'tribeca_notifier',
            env: 'DATABASE_NAME',
        }
    }
});

config.validate({ allowed: 'strict' });

export default config.getProperties();
