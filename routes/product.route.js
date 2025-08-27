import express from 'express';
import { addProduct, getProducts, updateProduct, deleteProduct, searchProductsController } from '../controllers/product.controller.js';
import uploadSingleImage from '../middleware/uploadMiddleware.js';

const router = express.Router();

router.post('/add-product/:categoryId/:subCategoryId',uploadSingleImage, addProduct);
router.get('/get-products/:categoryId/:subCategoryId', getProducts);
router.get('/get-products-by-title/search', searchProductsController);
router.put('/update-product/:productId', updateProduct);
router.delete('/delete-product/:productId', deleteProduct);

export default router;
