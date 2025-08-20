import { Router } from "express";
import * as productsCtl from "../controllers/products.controllers.js";
import { autJwt } from '../middlewares/index.js';

const router = Router();

// Crear producto (requiere autenticación y moderador)
router.post(
  '/',
  [autJwt.verifyToken, autJwt.isModerator],
  productsCtl.createProducts
);

// Consultar todos los productos (sin autenticación)
router.get(
  '/',
  productsCtl.getProducts
);

// Consultar producto por ID (sin autenticación)
router.get(
  '/:productId',
  productsCtl.getProductById
);

// Actualizar producto (requiere autenticación y admin)
router.put(
  '/:productId',
  [autJwt.verifyToken, autJwt.isAdmin],
  productsCtl.updateProduct
);

// Eliminar producto (requiere autenticación y admin)
router.delete(
  '/:productId',
  [autJwt.verifyToken, autJwt.isAdmin],
  productsCtl.deleteProduct
);

export default router;