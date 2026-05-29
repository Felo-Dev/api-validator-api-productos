import app, { config } from './app.js';
import { pool } from './db/index.js';
import { getRedisClient, closeRedis, eventBus, EVENTS, createLogger } from '@ecommerce/shared';
import { autoCreateFromOrder } from './controllers/invoices.controller.js';

const logger = createLogger('billing-service');

/**
 * @descripción Inicia el servicio de facturación: conecta la base de datos, inicializa Redis, el bus de eventos y el esquema, suscribe al evento ORDER_PAID y levanta el servidor HTTP.
 * @returns {Promise<void>}
 * @throws {Error} Si falla la conexión a BD, Redis o la inicialización del bus de eventos.
 */
async function start() {
    try {
        const client = await pool.connect();
        await client.query('SELECT 1');
        client.release();

        await getRedisClient({ host: config.REDIS_HOST, port: config.REDIS_PORT });
        await eventBus.initialize({ host: config.REDIS_HOST, port: config.REDIS_PORT });

        await initSchema();

        await eventBus.subscribe(EVENTS.ORDER_PAID, async (data) => {
            logger.info('Order paid event received:', data);
            await autoCreateFromOrder(data);
        });

        const server = app.listen(config.PORT, () => {
            logger.info(`Billing service running on port ${config.PORT}`);
        });

        /**
         * @descripción Detiene gracefulmente el servicio: cierra el servidor HTTP, el bus de eventos, Redis y el pool de BD.
         * @param {string} signal - Señal de terminación recibida (SIGTERM, SIGINT).
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
 * @descripción Crea las tablas e índices necesarios en la base de datos si no existen (user_fiscal_data, invoice_series, invoices, invoice_items, cfdi_cancellations).
 * @returns {Promise<void>}
 * @throws {Error} Si falla la transacción de creación del esquema.
 */
async function initSchema() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        await client.query(`
            CREATE TABLE IF NOT EXISTS user_fiscal_data (
                id SERIAL PRIMARY KEY,
                user_id INTEGER UNIQUE NOT NULL,
                rfc TEXT UNIQUE NOT NULL,
                legal_name TEXT NOT NULL,
                tax_regime TEXT NOT NULL,
                cfdi_usage TEXT NOT NULL DEFAULT 'G03',
                tax_email TEXT,
                phone TEXT,
                address JSONB,
                created_at TIMESTAMPTZ DEFAULT now(),
                updated_at TIMESTAMPTZ DEFAULT now()
            )
        `);

        await client.query(`
            CREATE TABLE IF NOT EXISTS invoice_series (
                id SERIAL PRIMARY KEY,
                serie TEXT NOT NULL DEFAULT 'F',
                year INTEGER NOT NULL,
                current_folio INTEGER NOT NULL DEFAULT 0,
                UNIQUE(serie, year)
            )
        `);

        await client.query(`
            CREATE TABLE IF NOT EXISTS invoices (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL,
                order_id INTEGER,
                invoice_type TEXT NOT NULL DEFAULT 'I',
                invoice_serie TEXT NOT NULL DEFAULT 'F',
                invoice_folio INTEGER,
                rfc_emisor TEXT NOT NULL,
                rfc_receptor TEXT NOT NULL,
                legal_name TEXT NOT NULL,
                tax_regime TEXT NOT NULL,
                cfdi_usage TEXT NOT NULL,
                payment_form TEXT NOT NULL DEFAULT '99',
                payment_method TEXT NOT NULL DEFAULT 'PPD',
                currency TEXT NOT NULL DEFAULT 'MXN',
                exchange_rate NUMERIC(12,6) DEFAULT 1,
                subtotal NUMERIC(12,2) NOT NULL,
                discount NUMERIC(12,2) DEFAULT 0,
                iva NUMERIC(12,2) DEFAULT 0,
                iva_retained NUMERIC(12,2) DEFAULT 0,
                isr_retained NUMERIC(12,2) DEFAULT 0,
                ieps NUMERIC(12,2) DEFAULT 0,
                total NUMERIC(12,2) NOT NULL,
                cfdi_uuid UUID,
                cfdi_xml TEXT,
                cfdi_stamped_at TIMESTAMPTZ,
                cfdi_canceled_at TIMESTAMPTZ,
                cfdi_status TEXT NOT NULL DEFAULT 'pending',
                notes TEXT,
                internal_notes TEXT,
                created_at TIMESTAMPTZ DEFAULT now(),
                updated_at TIMESTAMPTZ DEFAULT now()
            )
        `);

        await client.query(`
            CREATE TABLE IF NOT EXISTS invoice_items (
                id SERIAL PRIMARY KEY,
                invoice_id INTEGER REFERENCES invoices(id) ON DELETE CASCADE,
                product_id INTEGER,
                sat_product_code TEXT DEFAULT '01010101',
                sat_unit_code TEXT DEFAULT 'H87',
                description TEXT NOT NULL,
                quantity NUMERIC(12,6) NOT NULL,
                unit TEXT NOT NULL DEFAULT 'pieza',
                unit_price NUMERIC(12,6) NOT NULL,
                discount NUMERIC(12,2) DEFAULT 0,
                subtotal NUMERIC(12,2) NOT NULL,
                iva_rate NUMERIC(5,2),
                iva_amount NUMERIC(12,2) DEFAULT 0,
                ieps_rate NUMERIC(5,2) DEFAULT 0,
                ieps_amount NUMERIC(12,2) DEFAULT 0,
                total NUMERIC(12,2) NOT NULL
            )
        `);

        await client.query(`
            CREATE TABLE IF NOT EXISTS cfdi_cancellations (
                id SERIAL PRIMARY KEY,
                invoice_id INTEGER REFERENCES invoices(id) ON DELETE CASCADE,
                uuid UUID NOT NULL,
                cancellation_reason TEXT NOT NULL,
                cancellation_uuid UUID,
                cancellation_xml TEXT,
                cancellation_status TEXT DEFAULT 'pending',
                cancellation_error TEXT,
                created_at TIMESTAMPTZ DEFAULT now(),
                processed_at TIMESTAMPTZ
            )
        `);

        await client.query(`CREATE INDEX IF NOT EXISTS idx_invoices_user ON invoices(user_id)`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(cfdi_status)`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_invoices_order ON invoices(order_id)`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_invoices_created ON invoices(created_at)`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice ON invoice_items(invoice_id)`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_user_fiscal_user ON user_fiscal_data(user_id)`);

        await client.query('COMMIT');
        logger.info('Schema initialized successfully');
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
}

start();
