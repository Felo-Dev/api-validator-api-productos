import { Router } from 'express';
import * as ctl from '../controllers/products.controller.js';
import { validate, validateQuery, paginationSchema, createProductSchema, updateProductSchema, createCategorySchema } from '@ecommerce/shared';

const router = Router();

router.post('/products', validate(createProductSchema), ctl.createProduct);
router.get('/products', validateQuery(paginationSchema), ctl.listProducts);
router.get('/products/:productId', ctl.getProductById);
router.put('/products/:productId', validate(updateProductSchema), ctl.updateProduct);
router.delete('/products/:productId', ctl.deleteProduct);

router.post('/categories', validate(createCategorySchema), ctl.createCategory);
router.get('/categories', ctl.listCategories);
router.get('/categories/slug/:slug', ctl.getCategoryBySlug);
router.get('/categories/:categoryId', ctl.getCategoryById);
router.put('/categories/:categoryId', validate(createCategorySchema.partial()), ctl.updateCategory);
router.delete('/categories/:categoryId', ctl.deleteCategory);

export default router;
