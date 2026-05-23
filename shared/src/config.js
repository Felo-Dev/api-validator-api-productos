import dotenv from 'dotenv';
dotenv.config();

export const loadConfig = (defaults = {}) => {
    const required = ['JWT_SECRET'];
    const missing = required.filter(key => !process.env[key]);
    if (missing.length > 0) {
        throw new Error(`Missing required env vars: ${missing.join(', ')}`);
    }

    return Object.freeze({
        ...defaults,
        PORT: Number(process.env.PORT) || 4000,
        JWT_SECRET: process.env.JWT_SECRET,
        JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || `${process.env.JWT_SECRET}_refresh`,
        NODE_ENV: process.env.NODE_ENV || 'development',
        REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',
        REDIS_HOST: process.env.REDIS_HOST || 'localhost',
        REDIS_PORT: Number(process.env.REDIS_PORT) || 6379,
        REDIS_PASSWORD: process.env.REDIS_PASSWORD || undefined,
    });
};

export const loadDbConfig = (prefix = 'PG') => {
    return {
        host: process.env[`${prefix}HOST`] || '127.0.0.1',
        port: Number(process.env[`${prefix}PORT`] || 5432),
        user: process.env[`${prefix}USER`] || 'postgres',
        password: process.env[`${prefix}PASSWORD`] || 'postgres',
        database: process.env[`${prefix}DATABASE`] || 'ecommerce_db',
        max: Number(process.env[`${prefix}MAX_CONNECTIONS`] || 10),
    };
};
