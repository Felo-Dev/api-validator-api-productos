import { query } from '../db/index.js';

const PRODUCT_COLS = 'id, name, description, category, price, compare_at_price, stock, sku, images, tags, is_active, tax_rate, created_at, updated_at';

export async function createProduct(data) {
    const result = await query(
        `INSERT INTO products (name, description, category, price, compare_at_price, stock, sku, images, tags, is_active, tax_rate)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         RETURNING ${PRODUCT_COLS}`,
        [data.name, data.description || null, data.category, data.price, data.compareAtPrice || null, data.stock || 0, data.sku || null, data.images || [], data.tags || [], data.isActive !== false, data.taxRate || 16.00]
    );
    return result.rows[0];
}

export async function listProducts({ page = 1, limit = 20, category, search, minPrice, maxPrice, sortBy = 'created_at', sortOrder = 'desc', isActive = true } = {}) {
    const offset = (page - 1) * limit;
    const conditions = [];
    const values = [];
    let idx = 1;

    if (isActive !== null) { conditions.push(`is_active = $${idx}`); values.push(isActive); idx++; }
    if (category) { conditions.push(`category ILIKE $${idx}`); values.push(`%${category}%`); idx++; }
    if (search) { conditions.push(`(name ILIKE $${idx} OR description ILIKE $${idx})`); values.push(`%${search}%`); idx++; }
    if (minPrice) { conditions.push(`price >= $${idx}`); values.push(minPrice); idx++; }
    if (maxPrice) { conditions.push(`price <= $${idx}`); values.push(maxPrice); idx++; }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const sortCol = ['name', 'price', 'stock', 'created_at', 'updated_at'].includes(sortBy) ? sortBy : 'created_at';
    const sortDir = sortOrder === 'asc' ? 'ASC' : 'DESC';

    const result = await query(
        `SELECT ${PRODUCT_COLS}, COUNT(*) OVER() as total FROM products ${where} ORDER BY ${sortCol} ${sortDir} LIMIT $${idx} OFFSET $${idx + 1}`,
        [...values, limit, offset]
    );

    const data = result.rows.map(({ total, ...product }) => product);
    return { data, total: result.rows[0]?.total ? Number(result.rows[0].total) : 0 };
}

export async function getProductById(id) {
    const result = await query(`SELECT ${PRODUCT_COLS} FROM products WHERE id = $1`, [id]);
    return result.rows[0] || null;
}

export async function updateProduct(id, data) {
    const fields = Object.entries(data).filter(([, v]) => v !== undefined);
    if (fields.length === 0) return null;

    const setClauses = [];
    const values = [];
    let idx = 1;
    for (const [key, value] of fields) {
        const col = key === 'compareAtPrice' ? 'compare_at_price' : key === 'isActive' ? 'is_active' : key;
        setClauses.push(`${col} = $${idx++}`);
        values.push(value);
    }
    values.push(id);

    const result = await query(
        `UPDATE products SET ${setClauses.join(', ')}, updated_at = now() WHERE id = $${idx} RETURNING ${PRODUCT_COLS}`,
        values
    );
    return result.rows[0] || null;
}

export async function deleteProduct(id) {
    const result = await query(`DELETE FROM products WHERE id = $1 RETURNING id`, [id]);
    return result.rows[0] || null;
}

export async function updateStock(id, quantity) {
    const result = await query(
        `UPDATE products SET stock = stock + $1, updated_at = now() WHERE id = $2 AND stock + $1 >= 0 RETURNING ${PRODUCT_COLS}`,
        [quantity, id]
    );
    return result.rows[0] || null;
}

export async function reserveStock(productId, quantity) {
    const result = await query(
        `UPDATE products SET stock = stock - $1, reserved_stock = reserved_stock + $1, updated_at = now()
         WHERE id = $2 AND stock - $1 >= 0 RETURNING ${PRODUCT_COLS}`,
        [quantity, productId]
    );
    return result.rows[0] || null;
}

export async function releaseReservedStock(productId, quantity) {
    const result = await query(
        `UPDATE products SET stock = stock + $1, reserved_stock = reserved_stock - $1, updated_at = now()
         WHERE id = $2 RETURNING ${PRODUCT_COLS}`,
        [quantity, productId]
    );
    return result.rows[0] || null;
}

export async function confirmReservedStock(productId, quantity) {
    const result = await query(
        `UPDATE products SET reserved_stock = reserved_stock - $1, updated_at = now() WHERE id = $2 RETURNING ${PRODUCT_COLS}`,
        [quantity, productId]
    );
    return result.rows[0] || null;
}
