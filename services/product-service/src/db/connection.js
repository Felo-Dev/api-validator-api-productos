import pkg from 'pg';
const { Pool } = pkg;

/**
 * @descripción Crea y retorna un Pool de conexiones PostgreSQL con la configuración dada.
 * @param {Object} dbConfig - Configuración de la base de datos.
 * @param {string} dbConfig.host - Host de la BD.
 * @param {number} dbConfig.port - Puerto de la BD.
 * @param {string} dbConfig.user - Usuario de la BD.
 * @param {string} dbConfig.password - Contraseña de la BD.
 * @param {string} dbConfig.database - Nombre de la base de datos.
 * @param {number} dbConfig.max - Número máximo de conexiones en el pool.
 * @returns {import('pg').Pool} Pool de conexiones PostgreSQL.
 */
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
