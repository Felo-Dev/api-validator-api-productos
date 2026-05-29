import app, { config } from './app.js';
import { pool } from './db/index.js';
import { getRedisClient, closeRedis, eventBus, createLogger } from '@ecommerce/shared';

const logger = createLogger('order-service');

/**
 * @descripción Inicia el servicio de pedidos: conecta BD, Redis, bus de eventos, crea esquemas y levanta el servidor HTTP.
 * @returns {Promise<void>}
 * @throws {Error} Si falla el inicio, termina el proceso con código 1.
 */
async function start() {
    try {
        const client = await pool.connect();
        await client.query('SELECT 1');
        client.release();

        await getRedisClient({ host: config.REDIS_HOST, port: config.REDIS_PORT });
        await eventBus.initialize({ host: config.REDIS_HOST, port: config.REDIS_PORT });

        await initSchema();

        await eventBus.subscribe('order.created', (data) => {
            logger.info('Order created:', data.orderId);
        });

        const server = app.listen(config.PORT, () => {
            logger.info(`Order service running on port ${config.PORT}`);
        });

        /**
         * @descripción Detiene el servidor, cierra Redis, bus de eventos y pool de BD.
         * @param {string} signal - Señal recibida (SIGTERM o SIGINT).
         * @returns {Promise<void>}
         */
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

/**
 * @descripción Crea las tablas `orders`, `order_items`, `carts` y `cart_items` con índices si no existen.
 * @returns {Promise<void>}
 */
async function initSchema() {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS orders (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL,
            subtotal NUMERIC(12,2) NOT NULL,
            tax NUMERIC(12,2) NOT NULL DEFAULT 0,
            shipping_cost NUMERIC(12,2) NOT NULL DEFAULT 0,
            total NUMERIC(12,2) NOT NULL,
            shipping_address JSONB NOT NULL,
            payment_method TEXT NOT NULL,
            payment_intent_id TEXT,
            notes TEXT,
            status TEXT NOT NULL DEFAULT 'pending',
            created_at TIMESTAMPTZ DEFAULT now(),
            updated_at TIMESTAMPTZ DEFAULT now()
        );

        CREATE TABLE IF NOT EXISTS order_items (
            id SERIAL PRIMARY KEY,
            order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
            product_id INTEGER NOT NULL,
            quantity INTEGER NOT NULL,
            price NUMERIC(12,2) NOT NULL,
            total NUMERIC(12,2) NOT NULL
        );

        CREATE TABLE IF NOT EXISTS carts (
            id SERIAL PRIMARY KEY,
            user_id INTEGER UNIQUE NOT NULL,
            created_at TIMESTAMPTZ DEFAULT now(),
            updated_at TIMESTAMPTZ DEFAULT now()
        );

        CREATE TABLE IF NOT EXISTS cart_items (
            id SERIAL PRIMARY KEY,
            cart_id INTEGER REFERENCES carts(id) ON DELETE CASCADE,
            product_id INTEGER NOT NULL,
            quantity INTEGER NOT NULL DEFAULT 1,
            UNIQUE(cart_id, product_id)
        );

        CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
        CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
        CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
    `);
}

start();
