import { createPool } from '../db/connection.js';
import { loadDbConfig, createLogger } from '@ecommerce/shared';

const logger = createLogger('billing-service');
const dbConfig = loadDbConfig('BILLING_DB');
/**
 * @descripción Pool de conexiones a PostgreSQL inicializado con la configuración de BILLING_DB.
 * @type {Object}
 */
export const pool = createPool(dbConfig);
/**
 * @descripción Ejecuta una consulta SQL usando el pool de conexiones.
 * @param {string} text - Texto de la consulta SQL con placeholders.
 * @param {Array} [params] - Parámetros para la consulta parametrizada.
 * @returns {Promise<Object>} Resultado de la consulta (rows, rowCount, etc.).
 */
export const query = (text, params) => pool.query(text, params);
