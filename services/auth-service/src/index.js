import app, { config } from './app.js';
import { createLogger } from '@ecommerce/shared';

const logger = createLogger('auth-service');

/**
 * @descripción Inicia el servidor del servicio de autenticación y configura los manejadores de señales
 * @returns {Promise<void>}
 */
async function start() {
    const server = app.listen(config.PORT, () => {
        logger.info(`Auth service running on port ${config.PORT}`);
    });

    /**
     * @descripción Manejador de apagado graceful que cierra el servidor al recibir una señal
     * @param {string} signal - Nombre de la señal recibida (SIGTERM, SIGINT)
     */
    async function shutdown(signal) {
        logger.info(`${signal} received. Shutting down...`);
        server.close(() => process.exit(0));
        setTimeout(() => process.exit(1), 10000);
    }

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
}

start();
