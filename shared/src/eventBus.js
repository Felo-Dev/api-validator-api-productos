import { getRedisClient, getRedisSync } from './redis.js';

export class EventBus {
    constructor(redisClient = null) {
        this.redis = redisClient;
        this.subscriber = null;
        this.channels = new Map();
    }

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

    async unsubscribe(channel) {
        if (this.subscriber && this.subscriber.isOpen) {
            await this.subscriber.unsubscribe(channel);
        }
        this.channels.delete(channel);
    }

    async close() {
        if (this.subscriber && this.subscriber.isOpen) {
            await this.subscriber.quit();
        }
    }
}

export const eventBus = new EventBus();

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
