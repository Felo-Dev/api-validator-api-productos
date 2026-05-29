import { query } from '../db/index.js';

const PRODUCT_COLS = 'id, name, description, category, price, compare_at_price, stock, sku, images, tags, is_active, tax_rate, created_at, updated_at';

/**
 * @descripción Inserta un nuevo producto en la BD y retorna el registro creado.
 * @param {Object} data - Datos del producto.
 * @param {string} data.name - Nombre del producto.
 * @param {string} [data.description] - Descripción del producto.
 * @param {string} data.category - Categoría del producto.
 * @param {number} data.price - Precio del producto.
 * @param {number} [data.compareAtPrice] - Precio de comparación.
 * @param {number} [data.stock=0] - Cantidad en stock.
 * @param {string} [data.sku] - Código SKU único.
 * @param {Array} [data.images=[]] - Arreglo de imágenes.
 * @param {Array} [data.tags=[]] - Arreglo de etiquetas.
 * @param {boolean} [data.isActive=true] - Indica si el producto está activo.
 * @param {number} [data.taxRate=16.00] - Tasa de impuesto.
 * @returns {Promise<Object>} Producto creado.
 */
export async function createProduct(data) {
    const result = await query(
        `INSERT INTO products (name, description, category, price, compare_at_price, stock, sku, images, tags, is_active, tax_rate)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         RETURNING ${PRODUCT_COLS}`,
        [data.name, data.description || null, data.category, data.price, data.compareAtPrice || null, data.stock || 0, data.sku || null, data.images || [], data.tags || [], data.isActive !== false, data.taxRate || 16.00]
    );
    return result.rows[0];
}

/**
 * @descripción Lista productos con filtros dinámicos y paginación. Retorna datos y total.
 * @param {Object} [opts] - Opciones de filtrado y paginación.
 * @param {number} [opts.page=1] - Número de página.
 * @param {number} [opts.limit=20] - Productos por página.
 * @param {string} [opts.category] - Filtro por categoría (ILIKE).
 * @param {string} [opts.search] - Búsqueda por nombre o descripción (ILIKE).
 * @param {number} [opts.minPrice] - Precio mínimo.
 * @param {number} [opts.maxPrice] - Precio máximo.
 * @param {string} [opts.sortBy='created_at'] - Columna de ordenamiento.
 * @param {string} [opts.sortOrder='desc'] - Dirección del ordenamiento (asc/desc).
 * @param {boolean} [opts.isActive=true] - Filtrar por estado activo.
 * @returns {Promise<{data: Object[], total: number}>} Lista de productos y total.
 */
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

/**
 * @descripción Obtiene un producto por su ID.
 * @param {number|string} id - ID del producto.
 * @returns {Promise<Object|null>} Producto encontrado o null.
 */
export async function getProductById(id) {
    const result = await query(`SELECT ${PRODUCT_COLS} FROM products WHERE id = $1`, [id]);
    return result.rows[0] || null;
}

/**
 * @descripción Actualiza campos específicos de un producto. Retorna null si no hay cambios.
 * @param {number|string} id - ID del producto.
 * @param {Object} data - Campos a actualizar.
 * @returns {Promise<Object|null>} Producto actualizado o null.
 */
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

/**
 * @descripción Elimina un producto por ID.
 * @param {number|string} id - ID del producto.
 * @returns {Promise<Object|null>} Registro eliminado o null si no existe.
 */
export async function deleteProduct(id) {
    const result = await query(`DELETE FROM products WHERE id = $1 RETURNING id`, [id]);
    return result.rows[0] || null;
}

/**
 * @descripción Ajusta el stock de un producto sumando la cantidad dada. No permite stock negativo.
 * @param {number|string} id - ID del producto.
 * @param {number} quantity - Cantidad a sumar (puede ser negativa).
 * @returns {Promise<Object|null>} Producto actualizado o null si el stock resultante sería negativo.
 */
export async function updateStock(id, quantity) {
    const result = await query(
        `UPDATE products SET stock = stock + $1, updated_at = now() WHERE id = $2 AND stock + $1 >= 0 RETURNING ${PRODUCT_COLS}`,
        [quantity, id]
    );
    return result.rows[0] || null;
}

/**
 * @descripción Reduce el stock disponible y aumenta el stock reservado de un producto.
 * @param {number|string} productId - ID del producto.
 * @param {number} quantity - Cantidad a reservar.
 * @returns {Promise<Object|null>} Producto actualizado o null si no hay stock suficiente.
 */
export async function reserveStock(productId, quantity) {
    const result = await query(
        `UPDATE products SET stock = stock - $1, reserved_stock = reserved_stock + $1, updated_at = now()
         WHERE id = $2 AND stock - $1 >= 0 RETURNING ${PRODUCT_COLS}`,
        [quantity, productId]
    );
    return result.rows[0] || null;
}

/**
 * @descripción Libera stock previamente reservado: aumenta stock disponible y reduce stock reservado.
 * @param {number|string} productId - ID del producto.
 * @param {number} quantity - Cantidad a liberar.
 * @returns {Promise<Object|null>} Producto actualizado o null.
 */
export async function releaseReservedStock(productId, quantity) {
    const result = await query(
        `UPDATE products SET stock = stock + $1, reserved_stock = reserved_stock - $1, updated_at = now()
         WHERE id = $2 RETURNING ${PRODUCT_COLS}`,
        [quantity, productId]
    );
    return result.rows[0] || null;
}

/**
 * @descripción Confirma stock previamente reservado reduciendo solo el stock reservado (sin afectar disponible).
 * @param {number|string} productId - ID del producto.
 * @param {number} quantity - Cantidad a confirmar.
 * @returns {Promise<Object|null>} Producto actualizado o null.
 */
export async function confirmReservedStock(productId, quantity) {
    const result = await query(
        `UPDATE products SET reserved_stock = reserved_stock - $1, updated_at = now() WHERE id = $2 RETURNING ${PRODUCT_COLS}`,
        [quantity, productId]
    );
    return result.rows[0] || null;
}
