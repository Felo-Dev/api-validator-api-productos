import { getRedisClient, getRedisSync } from './redis.js';

/**
 * @descripción Bus de eventos basado en Redis Pub/Sub para comunicación entre servicios
 */
export class EventBus {
    /**
     * @descripción Inicializa una nueva instancia del bus de eventos
     * @param {Object} [redisClient=null] - Cliente de Redis opcional para usar en lugar de crear uno nuevo
     */
    constructor(redisClient = null) {
        this.redis = redisClient;
        this.subscriber = null;
        this.channels = new Map();
    }

    /**
     * @descripción Inicializa la conexión Redis y configura el suscriptor de eventos
     * @param {Object} [config={}] - Configuración de conexión a Redis
     * @returns {Promise<void>}
     */
    async initialize(config = {}) {
        this.redis = await getRedisClient(config);
        this.subscriber = this.redis.duplicate();

        this.subscriber.on('message', (channel, message) => {
            const handlers = this.channels.get(channel);
            if (handlers) {
                handlers.forEach(fn => {
                    try {
                        fn(JSON.parse(message));
                    } catch (err) {
                        console.error(`Error handling event on ${channel}:`, err);
                    }
                });
            }
        });
    }

    /**
     * @descripción Publica un evento en un canal de Redis con los datos proporcionados
     * @param {string} channel - Nombre del canal donde publicar
     * @param {Object} data - Datos del evento a publicar
     * @returns {Promise<void>}
     */
    async publish(channel, data) {
        if (!this.redis || !this.redis.isOpen) {
            console.warn(`Redis not connected, cannot publish to ${channel}`);
            return;
        }
        await this.redis.publish(channel, JSON.stringify({
            ...data,
            timestamp: new Date().toISOString(),
        }));
    }

    /**
     * @descripción Suscribe un manejador a un canal de eventos específico
     * @param {string} channel - Nombre del canal al que suscribirse
     * @param {Function} handler - Función manejadora que se ejecutará al recibir un evento
     * @returns {Promise<void>}
     */
    async subscribe(channel, handler) {
        if (!this.subscriber || !this.subscriber.isOpen) {
            console.warn('Redis subscriber not connected');
            return;
        }

        if (!this.channels.has(channel)) {
            await this.subscriber.subscribe(channel);
            this.channels.set(channel, []);
        }

        this.channels.get(channel).push(handler);
    }

    /**
     * @descripción Cancela la suscripción a un canal y elimina sus manejadores
     * @param {string} channel - Nombre del canal del que desuscribirse
     * @returns {Promise<void>}
     */
    async unsubscribe(channel) {
        if (this.subscriber && this.subscriber.isOpen) {
            await this.subscriber.unsubscribe(channel);
        }
        this.channels.delete(channel);
    }

    /**
     * @descripción Cierra la conexión del suscriptor de Redis
     * @returns {Promise<void>}
     */
    async close() {
        if (this.subscriber && this.subscriber.isOpen) {
            await this.subscriber.quit();
        }
    }
}

export const eventBus = new EventBus();

/**
 * @descripción Constantes con los nombres de todos los eventos del sistema para Pub/Sub
 */
export const EVENTS = Object.freeze({
    ORDER_CREATED: 'order.created',
    ORDER_UPDATED: 'order.updated',
    ORDER_CANCELLED: 'order.cancelled',
    ORDER_PAID: 'order.paid',
    PRODUCT_CREATED: 'product.created',
    PRODUCT_UPDATED: 'product.updated',
    PRODUCT_DELETED: 'product.deleted',
    INVENTORY_LOW: 'inventory.low',
    USER_CREATED: 'user.created',
    PAYMENT_SUCCESS: 'payment.success',
    PAYMENT_FAILED: 'payment.failed',
    NOTIFICATION_EMAIL: 'notification.email',
    NOTIFICATION_WEBHOOK: 'notification.webhook',
    INVOICE_CREATED: 'invoice.created',
    INVOICE_STAMPED: 'invoice.stamped',
    INVOICE_CANCELLED: 'invoice.cancelled',
    INVOICE_PAID: 'invoice.paid',
});
