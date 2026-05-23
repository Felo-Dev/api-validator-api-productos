import { createClient } from 'redis';

let redisClient = null;

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

export function getRedisSync() {
    return redisClient;
}

export async function closeRedis() {
    if (redisClient && redisClient.isOpen) {
        await redisClient.quit();
        redisClient = null;
    }
}
