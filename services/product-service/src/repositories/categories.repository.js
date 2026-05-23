import { query } from '../db/index.js';

export async function createCategory(data) {
    const slug = data.slug || data.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const result = await query(
        `INSERT INTO categories (name, slug, description, parent_id)
         VALUES ($1, $2, $3, $4)
         RETURNING id, name, slug, description, parent_id, created_at, updated_at`,
        [data.name, slug, data.description || null, data.parentId || null]
    );
    return result.rows[0];
}

export async function listCategories() {
    const result = await query(`SELECT id, name, slug, description, parent_id, created_at FROM categories ORDER BY name`);
    return result.rows;
}

export async function getCategoryById(id) {
    const result = await query(`SELECT id, name, slug, description, parent_id, created_at FROM categories WHERE id = $1`, [id]);
    return result.rows[0] || null;
}

export async function getCategoryBySlug(slug) {
    const result = await query(`SELECT id, name, slug, description, parent_id, created_at FROM categories WHERE slug = $1`, [slug]);
    return result.rows[0] || null;
}

export async function updateCategory(id, data) {
    const fields = Object.entries(data).filter(([, v]) => v !== undefined);
    if (fields.length === 0) return null;

    const setClauses = [];
    const values = [];
    let idx = 1;
    for (const [key, value] of fields) {
        const col = key === 'parentId' ? 'parent_id' : key;
        setClauses.push(`${col} = $${idx++}`);
        values.push(value);
    }
    values.push(id);

    const result = await query(
        `UPDATE categories SET ${setClauses.join(', ')}, updated_at = now() WHERE id = $${idx}
         RETURNING id, name, slug, description, parent_id, created_at, updated_at`,
        values
    );
    return result.rows[0] || null;
}

export async function deleteCategory(id) {
    const result = await query(`DELETE FROM categories WHERE id = $1 RETURNING id`, [id]);
    return result.rows[0] || null;
}
