import { Router } from "express";
import * as productsCtl from "../controllers/products.controllers.js";
import { authJwt } from '../middlewares/index.js';
import { upload } from '../middlewares/upload.js';
import { validate, productSchema, updateProductSchema, validateQuery, paginationSchema } from '../utils/validators.js';
import config from '../config.js';
import path from 'path';

const router = Router();

/**
 * @descripción Maneja la subida de una imagen de producto. Devuelve la URL pública del archivo.
 * @param {import('express').Request} req - Objeto de solicitud Express con el archivo image en form-data
 * @param {import('express').Response} res - Objeto de respuesta Express
 * @returns {void} - Responde con la URL y nombre del archivo subido
 */
router.post('/upload-image', [authJwt.verifyToken, upload.single('image')], (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
    }
    const fileUrl = `${req.protocol}://${req.get('host')}/${config.UPLOAD_DIR}/${req.file.filename}`;
    res.json({ url: fileUrl, filename: req.file.filename });
});

/**
 * @swagger
 * /api/products/upload-image:
 *   post:
 *     summary: Upload a product image
 *     tags: [Products]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Image uploaded successfully
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /api/products:
 *   post:
 *     summary: Create a new product
 *     tags: [Products]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, price]
 *             properties:
 *               name: { type: string }
 *               category: { type: string }
 *               price: { type: number }
 *               imgURL: { type: string, format: uri }
 *     responses:
 *       201:
 *         description: Product created
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.post('/', [authJwt.verifyToken, authJwt.isModerator, validate(productSchema)], productsCtl.createProducts);

/**
 * @swagger
 * /api/products:
 *   get:
 *     summary: List all products with pagination and filters
 *     tags: [Products]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *       - in: query
 *         name: category
 *         schema: { type: string }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: List of products with pagination
 */
router.get('/', [validateQuery(paginationSchema)], productsCtl.getProducts);

/**
 * @swagger
 * /api/products/{productId}:
 *   get:
 *     summary: Get a product by ID
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Product details
 *       404:
 *         description: Product not found
 */
router.get('/:productId', productsCtl.getProductById);

/**
 * @swagger
 * /api/products/{productId}:
 *   put:
 *     summary: Update a product
 *     tags: [Products]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               category: { type: string }
 *               price: { type: number }
 *               imgURL: { type: string }
 *     responses:
 *       200:
 *         description: Product updated
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.put('/:productId', [authJwt.verifyToken, authJwt.isAdmin, validate(updateProductSchema)], productsCtl.updateProduct);

/**
 * @swagger
 * /api/products/{productId}:
 *   delete:
 *     summary: Delete a product (soft delete)
 *     tags: [Products]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Product deleted
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.delete('/:productId', [authJwt.verifyToken, authJwt.isAdmin], productsCtl.deleteProduct);

export default router;
