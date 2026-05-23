import app, { config } from './app.js';
import { pool } from './db/index.js';
import { getRedisClient, closeRedis, eventBus, createLogger } from '@ecommerce/shared';

const logger = createLogger('product-service');

async function start() {
    try {
        const client = await pool.connect();
        await client.query('SELECT 1');
        client.release();

        await getRedisClient({ host: config.REDIS_HOST, port: config.REDIS_PORT });
        await eventBus.initialize({ host: config.REDIS_HOST, port: config.REDIS_PORT });

        await initSchema();

        const server = app.listen(config.PORT, () => {
            logger.info(`Product service running on port ${config.PORT}`);
        });

        async function shutdown(signal) {
            logger.info(`${signal} received. Shutting down...`);
            server.close(async () => {
                await eventBus.close();
                await closeRedis();
                await pool.end();
                process.exit(0);
            });
            setTimeout(() => process.exit(1), 10000);
        }

        process.on('SIGTERM', () => shutdown('SIGTERM'));
        process.on('SIGINT', () => shutdown('SIGINT'));
    } catch (err) {
        logger.error('Failed to start:', err);
        process.exit(1);
    }
}

async function initSchema() {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS categories (
            id SERIAL PRIMARY KEY,
            name TEXT NOT NULL,
            slug TEXT UNIQUE NOT NULL,
            description TEXT,
            parent_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
            created_at TIMESTAMPTZ DEFAULT now(),
            updated_at TIMESTAMPTZ DEFAULT now()
        );

        CREATE TABLE IF NOT EXISTS products (
            id SERIAL PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT,
            category TEXT NOT NULL,
            price NUMERIC(12,2) NOT NULL DEFAULT 0,
            compare_at_price NUMERIC(12,2),
            stock INTEGER NOT NULL DEFAULT 0,
            reserved_stock INTEGER NOT NULL DEFAULT 0,
            sku TEXT UNIQUE,
            images JSONB DEFAULT '[]',
            tags JSONB DEFAULT '[]',
            is_active BOOLEAN DEFAULT true,
            tax_rate NUMERIC(5,2) DEFAULT 16.00,
            created_at TIMESTAMPTZ DEFAULT now(),
            updated_at TIMESTAMPTZ DEFAULT now()
        );

        CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
        CREATE INDEX IF NOT EXISTS idx_products_price ON products(price);
        CREATE INDEX IF NOT EXISTS idx_products_stock ON products(stock);
        CREATE INDEX IF NOT EXISTS idx_products_active ON products(is_active);
    `);
}

start();
