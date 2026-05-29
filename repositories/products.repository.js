import { query } from '../db/connection.js';

const PRODUCT_SELECT = `SELECT id, name, category, price, img_url as "imgURL", created_at, updated_at`;

const ALLOWED_UPDATE_FIELDS = ['name', 'category', 'price', 'imgURL'];

/**
 * @descripción Crea un nuevo producto en la base de datos
 * @param {Object} params - Datos del producto
 * @param {string} params.name - Nombre del producto
 * @param {string} [params.category] - Categoría del producto
 * @param {number} params.price - Precio del producto
 * @param {string} [params.imgURL] - URL de la imagen del producto
 * @returns {Promise<Object>} - El producto creado con id, name, category, price, imgURL, created_at, updated_at
 */
export async function createProduct({ name, category, price, imgURL }) {
    const result = await query(
        `INSERT INTO products (name, category, price, img_url)
         VALUES ($1, $2, $3, $4)
         RETURNING id, name, category, price, img_url as "imgURL", created_at, updated_at`,
        [name, category, price, imgURL]
    );
    return result.rows[0];
}

/**
 * @descripción Obtiene una lista paginada de productos con filtros opcionales por categoría y búsqueda
 * @param {Object} [options] - Opciones de consulta
 * @param {number} [options.page=1] - Número de página
 * @param {number} [options.limit=20] - Cantidad de productos por página
 * @param {string} [options.category] - Filtro por categoría (búsqueda parcial insensible a mayúsculas)
 * @param {string} [options.search] - Término de búsqueda en nombre o categoría
 * @returns {Promise<{data: Object[], total: number, page: number, limit: number}>} - Lista paginada con metadatos
 */
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

/**
 * @descripción Obtiene un producto por su ID
 * @param {number} productId - ID del producto
 * @returns {Promise<Object|null>} - El producto encontrado o null si no existe o fue eliminado
 */
export async function getProductById(productId) {
    const result = await query(
        `${PRODUCT_SELECT} FROM products WHERE id = $1 AND deleted_at IS NULL`,
        [productId]
    );
    return result.rows[0] || null;
}

/**
 * @descripción Actualiza los campos permitidos de un producto (name, category, price, imgURL)
 * @param {number} productId - ID del producto a actualizar
 * @param {Object} fields - Objeto con los campos a actualizar
 * @returns {Promise<Object|null>} - El producto actualizado o null si no hay campos válidos
 */
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

/**
 * @descripción Realiza un borrado lógico de un producto estableciendo la fecha de eliminación
 * @param {number} productId - ID del producto a eliminar lógicamente
 * @returns {Promise<Object|null>} - El producto marcado como eliminado o null si no existe
 */
export async function softDeleteProduct(productId) {
    const result = await query(
        `UPDATE products SET deleted_at = now(), updated_at = now() WHERE id = $1 AND deleted_at IS NULL
         RETURNING id, name`,
        [productId]
    );
    return result.rows[0] || null;
}

/**
 * @descripción Elimina un producto de forma permanente de la base de datos
 * @param {number} productId - ID del producto a eliminar
 * @returns {Promise<void>}
 */
export async function deleteProduct(productId) {
    await query(`DELETE FROM products WHERE id = $1`, [productId]);
}
