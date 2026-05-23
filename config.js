import { config as dotenvConfig } from 'dotenv';

dotenvConfig();

const required = ['JWT_SECRET'];
const missing = required.filter(key => !process.env[key]);
if (missing.length > 0) {
    throw new Error(`Missing required env vars: ${missing.join(', ')}`);
}

export default Object.freeze({
    PORT: Number(process.env.PORT) || 4000,
    SECRET: process.env.JWT_SECRET,
    REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET + '_refresh',
    PGHOST: process.env.PGHOST || '127.0.0.1',
    PGPORT: Number(process.env.PGPORT) || 5432,
    PGUSER: process.env.PGUSER || 'postgres',
    PGPASSWORD: process.env.PGPASSWORD || '',
    PGDATABASE: process.env.PGDATABASE || 'api_validator_db',
    CORS_ORIGINS: process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : ['http://localhost:3000'],
    RATE_LIMIT_WINDOW_MS: Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
    RATE_LIMIT_MAX: Number(process.env.RATE_LIMIT_MAX) || 100,
    UPLOAD_DIR: process.env.UPLOAD_DIR || './uploads',
});
