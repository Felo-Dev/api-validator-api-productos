import { createPool } from '../db/connection.js';
import { loadDbConfig, createLogger } from '@ecommerce/shared';

const logger = createLogger('product-service');
const dbConfig = loadDbConfig('PRODUCT_DB');
export const pool = createPool(dbConfig);
export const query = (text, params) => pool.query(text, params);
