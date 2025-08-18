import { config as dotenvConfig } from 'dotenv';
import pkg from 'pg';

dotenvConfig();

const { Pool } = pkg;

export const pool = new Pool({
    host: process.env.PGHOST || '127.0.0.1',
    port: Number(process.env.PGPORT || 5432),
    user: process.env.PGUSER || 'postgres',
    password: process.env.PGPASSWORD || '',
    database: process.env.PGDATABASE || 'api_validator_db',
    max: 10,
    idleTimeoutMillis: 30000,
});

export const query = (text, params) => pool.query(text, params);


