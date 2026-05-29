import pkg from 'pg';
import { loadDbConfig } from '@ecommerce/shared';

const { Pool } = pkg;
const dbConfig = loadDbConfig('PG');

export const pool = new Pool({
    host: dbConfig.host,
    port: dbConfig.port,
    user: dbConfig.user,
    password: dbConfig.password,
    database: dbConfig.database,
    max: dbConfig.max,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
});

export const query = (text, params) => pool.query(text, params);
