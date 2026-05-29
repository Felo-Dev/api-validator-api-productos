import { createPool } from '../db/connection.js';
import { loadDbConfig, createLogger } from '@ecommerce/shared';

const logger = createLogger('product-service');
const dbConfig = loadDbConfig('PRODUCT_DB');
export const pool = createPool(dbConfig);
/**
 * @descripción Ejecuta una consulta SQL en el pool de conexiones de productos.
 * @param {string} text - Texto de la consulta SQL.
 * @param {Array} [params] - Parámetros para la consulta parametrizada.
 * @returns {Promise<import('pg').QueryResult>} Resultado de la consulta.
 */
export const query = (text, params) => pool.query(text, params);
