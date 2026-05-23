import * as productsRepo from '../repositories/products.repository.js';
import { pool } from '../db/connection.js';

export const createProducts = async (req, res) => {
    const { name, category, price, imgURL } = req.body;
    const productSaved = await productsRepo.createProduct({ name, category, price, imgURL });
    await pool.query('INSERT INTO audit_log (user_id, action, entity_type, entity_id) VALUES ($1, $2, $3, $4)', [req.userId, 'create', 'product', productSaved.id]);
    res.status(201).json(productSaved);
};

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

export const getProductById = async (req, res) => {
    const product = await productsRepo.getProductById(req.params.productId);
    if (!product) {
        return res.status(404).json({ message: 'Product not found' });
    }
    res.json(product);
};

export const updateProduct = async (req, res) => {
    const updated = await productsRepo.updateProduct(req.params.productId, req.body);
    if (!updated) {
        return res.status(404).json({ message: 'Product not found' });
    }
    await pool.query('INSERT INTO audit_log (user_id, action, entity_type, entity_id) VALUES ($1, $2, $3, $4)', [req.userId, 'update', 'product', req.params.productId]);
    res.json(updated);
};

export const deleteProduct = async (req, res) => {
    const deleted = await productsRepo.softDeleteProduct(req.params.productId);
    if (!deleted) {
        return res.status(404).json({ message: 'Product not found' });
    }
    await pool.query('INSERT INTO audit_log (user_id, action, entity_type, entity_id) VALUES ($1, $2, $3, $4)', [req.userId, 'delete', 'product', req.params.productId]);
    res.json({ message: 'Product deleted successfully' });
};
