import config from '../config.js';
import pkg from 'pg';

const { Pool } = pkg;

export const pool = new Pool({
    host: config.PGHOST,
    port: config.PGPORT,
    user: config.PGUSER,
    password: config.PGPASSWORD,
    database: config.PGDATABASE,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
});

export const query = (text, params) => pool.query(text, params);
