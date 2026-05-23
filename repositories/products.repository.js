import { query } from '../db/connection.js';

const PRODUCT_SELECT = `SELECT id, name, category, price, img_url as "imgURL", created_at, updated_at`;

const ALLOWED_UPDATE_FIELDS = ['name', 'category', 'price', 'imgURL'];

export async function createProduct({ name, category, price, imgURL }) {
    const result = await query(
        `INSERT INTO products (name, category, price, img_url)
         VALUES ($1, $2, $3, $4)
         RETURNING id, name, category, price, img_url as "imgURL", created_at, updated_at`,
        [name, category, price, imgURL]
    );
    return result.rows[0];
}

export async function listProducts({ page = 1, limit = 20, category, search } = {}) {
    const offset = (page - 1) * limit;
    const conditions = ['deleted_at IS NULL'];
    const values = [];
    let paramIdx = 1;

    if (category) {
        conditions.push(`category ILIKE $${paramIdx}`);
        values.push(`%${category}%`);
        paramIdx++;
    }

    if (search) {
        conditions.push(`(name ILIKE $${paramIdx} OR category ILIKE $${paramIdx})`);
        values.push(`%${search}%`);
        paramIdx++;
    }

    const whereClause = conditions.join(' AND ');

    const result = await query(
        `SELECT ${PRODUCT_SELECT.replace('SELECT', '')}, COUNT(*) OVER() as total_count
         FROM products
         WHERE ${whereClause}
         ORDER BY id DESC
         LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
        [...values, limit, offset]
    );

    return {
        data: result.rows.map(({ total_count, ...product }) => product),
        total: result.rows[0]?.total_count ? Number(result.rows[0].total_count) : 0,
        page: Number(page),
        limit: Number(limit),
    };
}

export async function getProductById(productId) {
    const result = await query(
        `${PRODUCT_SELECT} FROM products WHERE id = $1 AND deleted_at IS NULL`,
        [productId]
    );
    return result.rows[0] || null;
}

export async function updateProduct(productId, fields) {
    const allowed = Object.entries(fields).filter(([key]) => ALLOWED_UPDATE_FIELDS.includes(key));
    if (allowed.length === 0) return null;

    const setClauses = [];
    const values = [];
    let idx = 1;
    for (const [key, value] of allowed) {
        const column = key === 'imgURL' ? 'img_url' : key;
        setClauses.push(`${column} = $${idx++}`);
        values.push(value);
    }
    values.push(productId);
    const result = await query(
        `UPDATE products SET ${setClauses.join(', ')}, updated_at = now() WHERE id = $${idx} AND deleted_at IS NULL
         RETURNING id, name, category, price, img_url as "imgURL", created_at, updated_at`,
        values
    );
    return result.rows[0] || null;
}

export async function softDeleteProduct(productId) {
    const result = await query(
        `UPDATE products SET deleted_at = now(), updated_at = now() WHERE id = $1 AND deleted_at IS NULL
         RETURNING id, name`,
        [productId]
    );
    return result.rows[0] || null;
}

export async function deleteProduct(productId) {
    await query(`DELETE FROM products WHERE id = $1`, [productId]);
}
