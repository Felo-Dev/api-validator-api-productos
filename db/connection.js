import config from '../config.js';
import pkg from 'pg';

const { Pool } = pkg;

/**
 * Pool de conexiones a PostgreSQL configurado con los parámetros de conexión de la aplicación
 * @type {Pool}
 */
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

/**
 * @descripción Ejecuta una consulta SQL en la base de datos usando el pool de conexiones
 * @param {string} text - Texto de la consulta SQL parametrizada
 * @param {Array} [params] - Valores para los parámetros de la consulta
 * @returns {Promise<Object>} - Resultado de la consulta con filas y metadatos
 */
export const query = (text, params) => pool.query(text, params);
