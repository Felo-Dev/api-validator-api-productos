import { query } from '../db/connection.js';

export async function createProduct({ name, category, price, imgURL }) {
    const result = await query(
        `INSERT INTO products (name, category, price, img_url)
         VALUES ($1, $2, $3, $4)
         RETURNING id, name, category, price, img_url as "imgURL", created_at, updated_at`,
        [name, category, price, imgURL]
    );
    return result.rows[0];
}

export async function listProducts() {
    const result = await query(
        `SELECT id, name, category, price, img_url as "imgURL", created_at, updated_at
         FROM products
         ORDER BY id DESC`
    );
    return result.rows;
}

export async function getProductById(productId) {
    const result = await query(
        `SELECT id, name, category, price, img_url as "imgURL", created_at, updated_at
         FROM products WHERE id = $1`,
        [productId]
    );
    return result.rows[0] || null;
}

export async function updateProduct(productId, fields) {
    const setClauses = [];
    const values = [];
    let idx = 1;
    for (const [key, value] of Object.entries(fields)) {
        const column = key === 'imgURL' ? 'img_url' : key;
        setClauses.push(`${column} = $${idx++}`);
        values.push(value);
    }
    values.push(productId);
    const result = await query(
        `UPDATE products SET ${setClauses.join(', ')}, updated_at = now() WHERE id = $${idx}
         RETURNING id, name, category, price, img_url as "imgURL", created_at, updated_at`,
        values
    );
    return result.rows[0] || null;
}

export async function deleteProduct(productId) {
    await query(`DELETE FROM products WHERE id = $1`, [productId]);
}


