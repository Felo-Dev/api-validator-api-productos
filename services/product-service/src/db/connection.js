import pkg from 'pg';
const { Pool } = pkg;

export function createPool(dbConfig) {
    return new Pool({
        host: dbConfig.host,
        port: dbConfig.port,
        user: dbConfig.user,
        password: dbConfig.password,
        database: dbConfig.database,
        max: dbConfig.max,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
    });
}
