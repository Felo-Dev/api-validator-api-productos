import { query } from '../db/index.js';

/**
 * @descripción Inserta una nueva categoría. Genera un slug a partir del nombre si no se proporciona.
 * @param {Object} data - Datos de la categoría.
 * @param {string} data.name - Nombre de la categoría.
 * @param {string} [data.slug] - Slug único (se genera automáticamente si no se provee).
 * @param {string} [data.description] - Descripción de la categoría.
 * @param {number} [data.parentId] - ID de la categoría padre.
 * @returns {Promise<Object>} Categoría creada.
 */
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

/**
 * @descripción Obtiene todas las categorías ordenadas por nombre.
 * @returns {Promise<Object[]>} Lista de categorías.
 */
export async function listCategories() {
    const result = await query(`SELECT id, name, slug, description, parent_id, created_at FROM categories ORDER BY name`);
    return result.rows;
}

/**
 * @descripción Obtiene una categoría por su ID.
 * @param {number|string} id - ID de la categoría.
 * @returns {Promise<Object|null>} Categoría encontrada o null.
 */
export async function getCategoryById(id) {
    const result = await query(`SELECT id, name, slug, description, parent_id, created_at FROM categories WHERE id = $1`, [id]);
    return result.rows[0] || null;
}

/**
 * @descripción Obtiene una categoría por su slug.
 * @param {string} slug - Slug de la categoría.
 * @returns {Promise<Object|null>} Categoría encontrada o null.
 */
export async function getCategoryBySlug(slug) {
    const result = await query(`SELECT id, name, slug, description, parent_id, created_at FROM categories WHERE slug = $1`, [slug]);
    return result.rows[0] || null;
}

/**
 * @descripción Actualiza campos específicos de una categoría. Retorna null si no hay cambios.
 * @param {number|string} id - ID de la categoría.
 * @param {Object} data - Campos a actualizar.
 * @returns {Promise<Object|null>} Categoría actualizada o null.
 */
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

/**
 * @descripción Elimina una categoría por ID.
 * @param {number|string} id - ID de la categoría.
 * @returns {Promise<Object|null>} Registro eliminado o null si no existe.
 */
export async function deleteCategory(id) {
    const result = await query(`DELETE FROM categories WHERE id = $1 RETURNING id`, [id]);
    return result.rows[0] || null;
}
