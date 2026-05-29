import { createClient } from 'redis';

let redisClient = null;

/**
 * @descripción Obtiene o crea una conexión cliente a Redis. Reutiliza la conexión existente si está activa
 * @param {Object} [config={}] - Configuración de conexión (url, host, port, password)
 * @returns {Promise<Object>} - Cliente de Redis conectado
 */
export async function getRedisClient(config = {}) {
    if (redisClient && redisClient.isOpen) {
        return redisClient;
    }

    redisClient = createClient({
        url: config.url || `redis://${config.host || 'localhost'}:${config.port || 6379}`,
        password: config.password,
    });

    redisClient.on('error', (err) => {
        console.error('Redis Client Error:', err.message);
    });

    await redisClient.connect();
    return redisClient;
}

/**
 * @descripción Obtiene la instancia actual del cliente Redis sin crear una nueva conexión
 * @returns {Object|null} - Cliente de Redis o null si no está inicializado
 */
export function getRedisSync() {
    return redisClient;
}

/**
 * @descripción Cierra la conexión activa de Redis y limpia la referencia al cliente
 * @returns {Promise<void>}
 */
export async function closeRedis() {
    if (redisClient && redisClient.isOpen) {
        await redisClient.quit();
        redisClient = null;
    }
}
