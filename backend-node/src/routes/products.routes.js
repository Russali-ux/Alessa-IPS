import express from 'express';
import { authenticateToken } from '../middlewares/auth.middleware.js';
import * as productsController from '../controllers/products.controller.js';

const router = express.Router();

router.use(authenticateToken);

router.get('/:code', productsController.getProductsByCode);
router.post('/:code/import', productsController.importProducts);

export default router;
