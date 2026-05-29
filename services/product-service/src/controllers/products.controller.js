import * as productRepo from '../repositories/products.repository.js';
import * as categoryRepo from '../repositories/categories.repository.js';
import { success, created, paginated, createLogger } from '@ecommerce/shared';
import { eventBus, EVENTS } from '@ecommerce/shared';

const logger = createLogger('product-service');

/**
 * @descripción Crea un nuevo producto, publica el evento PRODUCT_CREATED y responde con 201.
 * @param {import('express').Request} req - Objeto de solicitud con datos validados en req.validated.
 * @param {import('express').Response} res - Objeto de respuesta.
 * @returns {Promise<void>}
 */
export async function createProduct(req, res) {
    const product = await productRepo.createProduct(req.validated);
    await eventBus.publish(EVENTS.PRODUCT_CREATED, { productId: product.id, name: product.name });
    created(res, product);
}

/**
 * @descripción Lista productos con filtros opcionales (categoría, búsqueda, precio) y paginación.
 * @param {import('express').Request} req - Objeto de solicitud con query params (page, limit, category, search, minPrice, maxPrice, sortBy, sortOrder).
 * @param {import('express').Response} res - Objeto de respuesta.
 * @returns {Promise<void>}
 */
export async function listProducts(req, res) {
    const { page, limit, category, search, minPrice, maxPrice, sortBy, sortOrder } = req.query;
    const result = await productRepo.listProducts({ page, limit, category, search, minPrice, maxPrice, sortBy, sortOrder });
    paginated(res, { ...result, page: Number(page) || 1, limit: Number(limit) || 20 });
}

/**
 * @descripción Obtiene un producto por su ID. Responde 404 si no existe.
 * @param {import('express').Request} req - Objeto de solicitud con req.params.productId.
 * @param {import('express').Response} res - Objeto de respuesta.
 * @returns {Promise<void>}
 */
export async function getProductById(req, res) {
    const product = await productRepo.getProductById(req.params.productId);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    success(res, product);
}

/**
 * @descripción Actualiza un producto existente, publica PRODUCT_UPDATED y responde 200. Responde 404 si no existe.
 * @param {import('express').Request} req - Objeto de solicitud con req.params.productId y req.validated.
 * @param {import('express').Response} res - Objeto de respuesta.
 * @returns {Promise<void>}
 */
export async function updateProduct(req, res) {
    const product = await productRepo.updateProduct(req.params.productId, req.validated);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    await eventBus.publish(EVENTS.PRODUCT_UPDATED, { productId: product.id });
    success(res, product);
}

/**
 * @descripción Elimina un producto por ID, publica PRODUCT_DELETED y responde 200. Responde 404 si no existe.
 * @param {import('express').Request} req - Objeto de solicitud con req.params.productId.
 * @param {import('express').Response} res - Objeto de respuesta.
 * @returns {Promise<void>}
 */
export async function deleteProduct(req, res) {
    const deleted = await productRepo.deleteProduct(req.params.productId);
    if (!deleted) return res.status(404).json({ success: false, message: 'Product not found' });
    await eventBus.publish(EVENTS.PRODUCT_DELETED, { productId: req.params.productId });
    success(res, { message: 'Product deleted' });
}

/**
 * @descripción Crea una nueva categoría y responde con 201.
 * @param {import('express').Request} req - Objeto de solicitud con datos validados en req.validated.
 * @param {import('express').Response} res - Objeto de respuesta.
 * @returns {Promise<void>}
 */
export async function createCategory(req, res) {
    const category = await categoryRepo.createCategory(req.validated);
    created(res, category);
}

/**
 * @descripción Lista todas las categorías ordenadas por nombre.
 * @param {import('express').Request} req - Objeto de solicitud.
 * @param {import('express').Response} res - Objeto de respuesta.
 * @returns {Promise<void>}
 */
export async function listCategories(req, res) {
    const categories = await categoryRepo.listCategories();
    success(res, categories);
}

/**
 * @descripción Obtiene una categoría por su ID. Responde 404 si no existe.
 * @param {import('express').Request} req - Objeto de solicitud con req.params.categoryId.
 * @param {import('express').Response} res - Objeto de respuesta.
 * @returns {Promise<void>}
 */
export async function getCategoryById(req, res) {
    const category = await categoryRepo.getCategoryById(req.params.categoryId);
    if (!category) return res.status(404).json({ success: false, message: 'Category not found' });
    success(res, category);
}

/**
 * @descripción Obtiene una categoría por su slug. Responde 404 si no existe.
 * @param {import('express').Request} req - Objeto de solicitud con req.params.slug.
 * @param {import('express').Response} res - Objeto de respuesta.
 * @returns {Promise<void>}
 */
export async function getCategoryBySlug(req, res) {
    const category = await categoryRepo.getCategoryBySlug(req.params.slug);
    if (!category) return res.status(404).json({ success: false, message: 'Category not found' });
    success(res, category);
}

/**
 * @descripción Actualiza una categoría existente y responde 200. Responde 404 si no existe.
 * @param {import('express').Request} req - Objeto de solicitud con req.params.categoryId y req.validated.
 * @param {import('express').Response} res - Objeto de respuesta.
 * @returns {Promise<void>}
 */
export async function updateCategory(req, res) {
    const category = await categoryRepo.updateCategory(req.params.categoryId, req.validated);
    if (!category) return res.status(404).json({ success: false, message: 'Category not found' });
    success(res, category);
}

/**
 * @descripción Elimina una categoría por ID y responde 200. Responde 404 si no existe.
 * @param {import('express').Request} req - Objeto de solicitud con req.params.categoryId.
 * @param {import('express').Response} res - Objeto de respuesta.
 * @returns {Promise<void>}
 */
export async function deleteCategory(req, res) {
    const deleted = await categoryRepo.deleteCategory(req.params.categoryId);
    if (!deleted) return res.status(404).json({ success: false, message: 'Category not found' });
    success(res, { message: 'Category deleted' });
}
