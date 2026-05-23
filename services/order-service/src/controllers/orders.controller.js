import * as orderRepo from '../repositories/orders.repository.js';
import { eventBus, EVENTS, success, created, paginated, createLogger } from '@ecommerce/shared';
import { getRedisClient } from '@ecommerce/shared';

const logger = createLogger('order-service');

export async function createOrder(req, res) {
    const userId = req.userId || req.headers['x-user-id'];
    const items = req.validated.items;
    const { shippingAddress, paymentMethod, notes } = req.validated;

    const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
    const tax = subtotal * 0.1;
    const shippingCost = subtotal > 100 ? 0 : 10;
    const total = subtotal + tax + shippingCost;

    const order = await orderRepo.createOrder({
        userId, items, shippingAddress, paymentMethod, notes, subtotal, tax, shippingCost, total,
    });

    await eventBus.publish(EVENTS.ORDER_CREATED, { orderId: order.id, userId, total });

    await eventBus.publish(EVENTS.ORDER_PAID, {
        orderId: order.id, userId, total, items,
        shippingAddress, paymentMethod, subtotal, tax, shippingCost,
    });

    created(res, order);
}

export async function listOrders(req, res) {
    const userId = req.userId || req.headers['x-user-id'];
    const { page, limit, status } = req.query;
    const result = await orderRepo.listOrders({ userId, page, limit, status });
    paginated(res, { ...result, page: Number(page) || 1, limit: Number(limit) || 20 });
}

export async function getOrder(req, res) {
    const userId = req.userId || req.headers['x-user-id'];
    const order = await orderRepo.getOrderById(req.params.orderId, userId);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    const items = await orderRepo.getOrderItems(order.id);
    success(res, { ...order, items });
}

export async function cancelOrder(req, res) {
    const userId = req.userId || req.headers['x-user-id'];
    const order = await orderRepo.getOrderById(req.params.orderId, userId);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    if (!['pending', 'processing'].includes(order.status)) {
        return res.status(400).json({ success: false, message: 'Order cannot be cancelled' });
    }

    const updated = await orderRepo.cancelOrder(req.params.orderId);
    await eventBus.publish(EVENTS.ORDER_CANCELLED, { orderId: order.id, userId });
    success(res, updated);
}

export async function getCart(req, res) {
    const userId = req.userId || req.headers['x-user-id'];
    let cart = await orderRepo.getUserCart(userId);
    if (!cart) {
        cart = await orderRepo.createCart(userId);
    }
    const items = await orderRepo.getCartItems(userId);
    success(res, { cart, items, total: items.reduce((sum, i) => sum + i.price * i.quantity, 0) });
}

export async function addToCart(req, res) {
    const userId = req.userId || req.headers['x-user-id'];
    const { productId, quantity } = req.validated;
    await orderRepo.addToCart(userId, productId, quantity);
    const items = await orderRepo.getCartItems(userId);
    success(res, { items, total: items.reduce((sum, i) => sum + i.price * i.quantity, 0) });
}

export async function updateCart(req, res) {
    const userId = req.userId || req.headers['x-user-id'];
    const { productId } = req.params;
    const { quantity } = req.body;
    await orderRepo.updateCartItemQuantity(userId, productId, quantity);
    const items = await orderRepo.getCartItems(userId);
    success(res, { items, total: items.reduce((sum, i) => sum + i.price * i.quantity, 0) });
}

export async function removeFromCart(req, res) {
    const userId = req.userId || req.headers['x-user-id'];
    await orderRepo.removeFromCart(userId, req.params.productId);
    const items = await orderRepo.getCartItems(userId);
    success(res, { items, total: items.reduce((sum, i) => sum + i.price * i.quantity, 0) });
}

export async function checkoutCart(req, res) {
    const userId = req.userId || req.headers['x-user-id'];
    const items = await orderRepo.getCartItems(userId);
    if (items.length === 0) return res.status(400).json({ success: false, message: 'Cart is empty' });

    const { shippingAddress, paymentMethod, notes } = req.body;
    const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
    const tax = subtotal * 0.1;
    const shippingCost = subtotal > 100 ? 0 : 10;
    const total = subtotal + tax + shippingCost;

    const orderItems = items.map(i => ({ productId: i.product_id, quantity: i.quantity, price: i.price }));
    const order = await orderRepo.createOrder({ userId, items: orderItems, shippingAddress, paymentMethod, notes, subtotal, tax, shippingCost, total });

    await orderRepo.clearCart(userId);
    await eventBus.publish(EVENTS.ORDER_CREATED, { orderId: order.id, userId, total });

    await eventBus.publish(EVENTS.ORDER_PAID, {
        orderId: order.id, userId, total, items: orderItems,
        shippingAddress, paymentMethod, subtotal, tax, shippingCost,
    });

    created(res, order);
}
