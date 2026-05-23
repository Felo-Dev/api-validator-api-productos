import { query, pool } from '../db/index.js';

export async function createOrder({ userId, items, shippingAddress, paymentMethod, notes, subtotal, tax, shippingCost, total }) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const orderResult = await client.query(
            `INSERT INTO orders (user_id, subtotal, tax, shipping_cost, total, shipping_address, payment_method, notes, status)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending')
             RETURNING id, user_id, subtotal, tax, shipping_cost, total, shipping_address, payment_method, notes, status, created_at, updated_at`,
            [userId, subtotal, tax, shippingCost, total, JSON.stringify(shippingAddress), paymentMethod, notes || null]
        );
        const order = orderResult.rows[0];

        for (const item of items) {
            await client.query(
                `INSERT INTO order_items (order_id, product_id, quantity, price, total)
                 VALUES ($1, $2, $3, $4, $5)`,
                [order.id, item.productId, item.quantity, item.price, item.quantity * item.price]
            );
        }

        await client.query('COMMIT');
        return order;
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
}

export async function listOrders({ userId, page = 1, limit = 20, status } = {}) {
    const offset = (page - 1) * limit;
    const conditions = [];
    const values = [];
    let idx = 1;

    if (userId) { conditions.push(`user_id = $${idx}`); values.push(userId); idx++; }
    if (status) { conditions.push(`status = $${idx}`); values.push(status); idx++; }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await query(
        `SELECT id, user_id, subtotal, tax, shipping_cost, total, shipping_address, payment_method, status, created_at,
                COUNT(*) OVER() as total_count
         FROM orders ${where} ORDER BY created_at DESC LIMIT $${idx} OFFSET $${idx + 1}`,
        [...values, limit, offset]
    );

    const data = result.rows.map(({ total_count, ...order }) => order);
    return { data, total: result.rows[0]?.total_count ? Number(result.rows[0].total_count) : 0 };
}

export async function getOrderById(id, userId = null) {
    const conditions = ['id = $1'];
    const values = [id];
    if (userId) { conditions.push('user_id = $2'); values.push(userId); }

    const result = await query(`SELECT * FROM orders WHERE ${conditions.join(' AND ')}`, values);
    return result.rows[0] || null;
}

export async function getOrderItems(orderId) {
    const result = await query(`SELECT * FROM order_items WHERE order_id = $1 ORDER BY id`, [orderId]);
    return result.rows;
}

export async function updateOrderStatus(id, status, paymentIntentId = null) {
    const fields = { status, updated_at: new Date() };
    if (paymentIntentId) fields.payment_intent_id = paymentIntentId;

    const setClauses = Object.keys(fields).map((k, i) => `${k} = $${i + 1}`);
    const values = Object.values(fields).concat(id);

    const result = await query(
        `UPDATE orders SET ${setClauses.join(', ')} WHERE id = $${values.length} RETURNING *`,
        values
    );
    return result.rows[0] || null;
}

export async function cancelOrder(id) {
    return updateOrderStatus(id, 'cancelled');
}

export async function getUserCart(userId) {
    const result = await query(`SELECT * FROM carts WHERE user_id = $1`, [userId]);
    return result.rows[0] || null;
}

export async function createCart(userId) {
    const result = await query(`INSERT INTO carts (user_id) VALUES ($1) RETURNING *`, [userId]);
    return result.rows[0];
}

export async function addToCart(userId, productId, quantity) {
    const result = await query(
        `INSERT INTO cart_items (cart_id, product_id, quantity)
         SELECT c.id, $2, $3 FROM carts c WHERE c.user_id = $1
         ON CONFLICT (cart_id, product_id) DO UPDATE SET quantity = cart_items.quantity + $3
         RETURNING *`,
        [userId, productId, quantity]
    );
    return result.rows[0];
}

export async function getCartItems(userId) {
    const result = await query(
        `SELECT ci.*, p.name, p.price, p.images
         FROM cart_items ci
         JOIN carts c ON c.id = ci.cart_id
         JOIN products p ON p.id = ci.product_id
         WHERE c.user_id = $1`,
        [userId]
    );
    return result.rows;
}

export async function updateCartItemQuantity(userId, productId, quantity) {
    if (quantity <= 0) {
        return removeFromCart(userId, productId);
    }
    const result = await query(
        `UPDATE cart_items SET quantity = $3
         FROM carts c WHERE c.id = cart_items.cart_id AND c.user_id = $1 AND cart_items.product_id = $2
         RETURNING *`,
        [userId, productId, quantity]
    );
    return result.rows[0];
}

export async function removeFromCart(userId, productId) {
    const result = await query(
        `DELETE FROM cart_items USING carts c
         WHERE c.id = cart_items.cart_id AND c.user_id = $1 AND cart_items.product_id = $2
         RETURNING cart_items.*`,
        [userId, productId]
    );
    return result.rows[0] || null;
}

export async function clearCart(userId) {
    await query(`DELETE FROM cart_items USING carts c WHERE c.id = cart_items.cart_id AND c.user_id = $1`, [userId]);
}
