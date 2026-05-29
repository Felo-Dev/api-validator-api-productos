import * as orderRepo from '../repositories/orders.repository.js';
import { eventBus, EVENTS, success, created, paginated, createLogger } from '@ecommerce/shared';
import { getRedisClient } from '@ecommerce/shared';

const logger = createLogger('order-service');

/**
 * @descripción Crea un pedido calculando subtotal, impuesto y costo de envío. Publica ORDER_CREATED y ORDER_PAID.
 * @param {import('express').Request} req - Objeto de solicitud con req.validated.items, shippingAddress, paymentMethod, notes.
 * @param {import('express').Response} res - Objeto de respuesta.
 * @returns {Promise<void>}
 */
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

/**
 * @descripción Lista pedidos del usuario con filtro opcional por estado y paginación.
 * @param {import('express').Request} req - Objeto de solicitud con query params (page, limit, status).
 * @param {import('express').Response} res - Objeto de respuesta.
 * @returns {Promise<void>}
 */
export async function listOrders(req, res) {
    const userId = req.userId || req.headers['x-user-id'];
    const { page, limit, status } = req.query;
    const result = await orderRepo.listOrders({ userId, page, limit, status });
    paginated(res, { ...result, page: Number(page) || 1, limit: Number(limit) || 20 });
}

/**
 * @descripción Obtiene un pedido por ID con sus artículos. Responde 404 si no existe.
 * @param {import('express').Request} req - Objeto de solicitud con req.params.orderId.
 * @param {import('express').Response} res - Objeto de respuesta.
 * @returns {Promise<void>}
 */
export async function getOrder(req, res) {
    const userId = req.userId || req.headers['x-user-id'];
    const order = await orderRepo.getOrderById(req.params.orderId, userId);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    const items = await orderRepo.getOrderItems(order.id);
    success(res, { ...order, items });
}

/**
 * @descripción Cancela un pedido si su estado es 'pending' o 'processing'. Publica ORDER_CANCELLED.
 * @param {import('express').Request} req - Objeto de solicitud con req.params.orderId.
 * @param {import('express').Response} res - Objeto de respuesta.
 * @returns {Promise<void>}
 */
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

/**
 * @descripción Obtiene el carrito del usuario. Crea uno nuevo si no existe.
 * @param {import('express').Request} req - Objeto de solicitud.
 * @param {import('express').Response} res - Objeto de respuesta.
 * @returns {Promise<void>}
 */
export async function getCart(req, res) {
    const userId = req.userId || req.headers['x-user-id'];
    let cart = await orderRepo.getUserCart(userId);
    if (!cart) {
        cart = await orderRepo.createCart(userId);
    }
    const items = await orderRepo.getCartItems(userId);
    success(res, { cart, items, total: items.reduce((sum, i) => sum + i.price * i.quantity, 0) });
}

/**
 * @descripción Agrega un producto al carrito del usuario. Retorna el carrito actualizado.
 * @param {import('express').Request} req - Objeto de solicitud con req.validated (productId, quantity).
 * @param {import('express').Response} res - Objeto de respuesta.
 * @returns {Promise<void>}
 */
export async function addToCart(req, res) {
    const userId = req.userId || req.headers['x-user-id'];
    const { productId, quantity } = req.validated;
    await orderRepo.addToCart(userId, productId, quantity);
    const items = await orderRepo.getCartItems(userId);
    success(res, { items, total: items.reduce((sum, i) => sum + i.price * i.quantity, 0) });
}

/**
 * @descripción Actualiza la cantidad de un producto en el carrito del usuario.
 * @param {import('express').Request} req - Objeto de solicitud con req.params.productId y req.body.quantity.
 * @param {import('express').Response} res - Objeto de respuesta.
 * @returns {Promise<void>}
 */
export async function updateCart(req, res) {
    const userId = req.userId || req.headers['x-user-id'];
    const { productId } = req.params;
    const { quantity } = req.body;
    await orderRepo.updateCartItemQuantity(userId, productId, quantity);
    const items = await orderRepo.getCartItems(userId);
    success(res, { items, total: items.reduce((sum, i) => sum + i.price * i.quantity, 0) });
}

/**
 * @descripción Elimina un producto del carrito del usuario.
 * @param {import('express').Request} req - Objeto de solicitud con req.params.productId.
 * @param {import('express').Response} res - Objeto de respuesta.
 * @returns {Promise<void>}
 */
export async function removeFromCart(req, res) {
    const userId = req.userId || req.headers['x-user-id'];
    await orderRepo.removeFromCart(userId, req.params.productId);
    const items = await orderRepo.getCartItems(userId);
    success(res, { items, total: items.reduce((sum, i) => sum + i.price * i.quantity, 0) });
}

/**
 * @descripción Convierte el carrito en un pedido: calcula totales, crea la orden, vacía el carrito y publica eventos.
 * @param {import('express').Request} req - Objeto de solicitud con req.body (shippingAddress, paymentMethod, notes).
 * @param {import('express').Response} res - Objeto de respuesta.
 * @returns {Promise<void>}
 */
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
