import { createPool } from '../db/connection.js';
import { loadDbConfig, createLogger } from '@ecommerce/shared';

const logger = createLogger('billing-service');
const dbConfig = loadDbConfig('BILLING_DB');
export const pool = createPool(dbConfig);
export const query = (text, params) => pool.query(text, params);
