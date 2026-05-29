import { Router } from 'express';
import * as ctl from '../controllers/orders.controller.js';
import { validate, createOrderSchema, addCartItemSchema } from '@ecommerce/shared';

const router = Router();

router.post('/orders', validate(createOrderSchema), ctl.createOrder);
router.get('/orders', ctl.listOrders);
router.get('/orders/:orderId', ctl.getOrder);
router.post('/orders/:orderId/cancel', ctl.cancelOrder);
router.post('/orders/:orderId/checkout', ctl.checkoutCart);

router.get('/cart', ctl.getCart);
router.post('/cart/items', validate(addCartItemSchema), ctl.addToCart);
router.put('/cart/items/:productId', ctl.updateCart);
router.delete('/cart/items/:productId', ctl.removeFromCart);
router.post('/cart/checkout', ctl.checkoutCart);

/**
 * @descripción Rutas de pedidos y carrito de compras. Monta endpoints CRUD con validación de esquemas.
 * @returns {import('express').Router} Router de Express con las rutas configuradas.
 */
export default router;
