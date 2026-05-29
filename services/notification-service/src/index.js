import express from 'express';
import { loadConfig, eventBus, EVENTS, success, closeRedis, getRedisClient, createLogger } from '@ecommerce/shared';

const config = loadConfig({ PORT: 4004 });
const logger = createLogger('notification-service');

const app = express();
app.use(express.json());

/**
 * @descripción Ruta de verificación de salud del servicio de notificaciones
 * @param {Object} req - Objeto de petición de Express
 * @param {Object} res - Objeto de respuesta de Express
 */
app.get('/health', (req, res) => success(res, { service: 'notification-service', status: 'ok' }));

/**
 * @descripción Inicia el servidor del servicio de notificaciones, conecta Redis, suscribe eventos y configura apagado graceful
 * @returns {Promise<void>}
 */
async function start() {
    await getRedisClient({ host: config.REDIS_HOST, port: config.REDIS_PORT });
    await eventBus.initialize({ host: config.REDIS_HOST, port: config.REDIS_PORT });

    await eventBus.subscribe(EVENTS.ORDER_CREATED, (data) => {
        logger.info('Order created notification:', data);
    });

    await eventBus.subscribe(EVENTS.ORDER_CANCELLED, (data) => {
        logger.info('Order cancelled notification:', data);
    });

    await eventBus.subscribe(EVENTS.PAYMENT_SUCCESS, (data) => {
        logger.info('Payment success notification:', data);
    });

    const server = app.listen(config.PORT, () => {
        logger.info(`Notification service running on port ${config.PORT}`);
    });

    /**
     * @descripción Manejador de apagado graceful que cierra el servidor, el bus de eventos y Redis
     * @param {string} signal - Nombre de la señal recibida (SIGTERM, SIGINT)
     * @returns {Promise<void>}
     */
    async function shutdown(signal) {
        logger.info(`${signal} received. Shutting down...`);
        server.close(async () => {
            await eventBus.close();
            await closeRedis();
            process.exit(0);
        });
        setTimeout(() => process.exit(1), 10000);
    }

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
}

start();
