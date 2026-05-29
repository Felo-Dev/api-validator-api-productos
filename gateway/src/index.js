import app, { config } from './app.js';
import { getRedisClient, closeRedis } from '@ecommerce/shared';

/**
 * @descripción Inicia el servidor del gateway, conecta Redis y configura los manejadores de señales de apagado
 * @returns {Promise<void>}
 */
async function start() {
    try {
        await getRedisClient({ host: config.REDIS_HOST, port: config.REDIS_PORT, password: config.REDIS_PASSWORD });

        const server = app.listen(config.PORT, () => {
            console.log(`Gateway running on port ${config.PORT}`);
            console.log(`Auth service: ${config.AUTH_SERVICE_URL}`);
            console.log(`Product service: ${config.PRODUCT_SERVICE_URL}`);
            console.log(`Order service: ${config.ORDER_SERVICE_URL}`);
        });

        /**
         * @descripción Manejador de apagado graceful que cierra el servidor y desconecta Redis
         * @param {string} signal - Nombre de la señal recibida (SIGTERM, SIGINT)
         */
        async function gracefulShutdown(signal) {
            console.log(`\n${signal} received. Shutting down...`);
            server.close(async () => {
                await closeRedis();
                process.exit(0);
            });
            setTimeout(() => process.exit(1), 10000);
        }

        process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
        process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    } catch (err) {
        console.error('Failed to start gateway:', err);
        process.exit(1);
    }
}

start();
