import { createPool } from '../db/connection.js';
import { loadDbConfig, createLogger } from '@ecommerce/shared';

const logger = createLogger('order-service');
const dbConfig = loadDbConfig('ORDER_DB');
export const pool = createPool(dbConfig);
export const query = (text, params) => pool.query(text, params);
