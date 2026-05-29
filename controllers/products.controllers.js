import * as productsRepo from '../repositories/products.repository.js';
import { pool } from '../db/connection.js';

/**
 * @descripción Crea un nuevo producto y registra la acción en auditoría.
 * @param {import('express').Request} req - Objeto de solicitud Express con datos del producto en el cuerpo
 * @param {import('express').Response} res - Objeto de respuesta Express
 * @returns {Promise<void>} - Responde con el producto creado (código 201)
 */
export const createProducts = async (req, res) => {
    const { name, category, price, imgURL } = req.body;
    const productSaved = await productsRepo.createProduct({ name, category, price, imgURL });
    await pool.query('INSERT INTO audit_log (user_id, action, entity_type, entity_id) VALUES ($1, $2, $3, $4)', [req.userId, 'create', 'product', productSaved.id]);
    res.status(201).json(productSaved);
};

/**
 * @descripción Obtiene una lista paginada de productos con filtros opcionales por categoría y búsqueda.
 * @param {import('express').Request} req - Objeto de solicitud Express con query params: page, limit, category, search
 * @param {import('express').Response} res - Objeto de respuesta Express
 * @returns {Promise<void>} - Responde con la lista de productos y metadatos de paginación
 */
export const getProducts = async (req, res) => {
    const { page, limit, category, search } = req.query;
    const result = await productsRepo.listProducts({ page, limit, category, search });
    res.json({
        data: result.data,
        pagination: {
            page: result.page,
            limit: result.limit,
            total: result.total,
            pages: Math.ceil(result.total / result.limit),
        },
    });
};

/**
 * @descripción Obtiene un producto por su ID.
 * @param {import('express').Request} req - Objeto de solicitud Express con productId en los parámetros de ruta
 * @param {import('express').Response} res - Objeto de respuesta Express
 * @returns {Promise<void>} - Responde con el producto encontrado o error 404 si no existe
 */
export const getProductById = async (req, res) => {
    const product = await productsRepo.getProductById(req.params.productId);
    if (!product) {
        return res.status(404).json({ message: 'Product not found' });
    }
    res.json(product);
};

/**
 * @descripción Actualiza un producto existente y registra la acción en auditoría.
 * @param {import('express').Request} req - Objeto de solicitud Express con productId en ruta y datos en el cuerpo
 * @param {import('express').Response} res - Objeto de respuesta Express
 * @returns {Promise<void>} - Responde con el producto actualizado o error 404 si no existe
 */
export const updateProduct = async (req, res) => {
    const updated = await productsRepo.updateProduct(req.params.productId, req.body);
    if (!updated) {
        return res.status(404).json({ message: 'Product not found' });
    }
    await pool.query('INSERT INTO audit_log (user_id, action, entity_type, entity_id) VALUES ($1, $2, $3, $4)', [req.userId, 'update', 'product', req.params.productId]);
    res.json(updated);
};

/**
 * @descripción Elimina un producto de forma lógica (soft delete) y registra la acción en auditoría.
 * @param {import('express').Request} req - Objeto de solicitud Express con productId en los parámetros de ruta
 * @param {import('express').Response} res - Objeto de respuesta Express
 * @returns {Promise<void>} - Responde confirmando la eliminación o error 404 si no existe
 */
export const deleteProduct = async (req, res) => {
    const deleted = await productsRepo.softDeleteProduct(req.params.productId);
    if (!deleted) {
        return res.status(404).json({ message: 'Product not found' });
    }
    await pool.query('INSERT INTO audit_log (user_id, action, entity_type, entity_id) VALUES ($1, $2, $3, $4)', [req.userId, 'delete', 'product', req.params.productId]);
    res.json({ message: 'Product deleted successfully' });
};
