import express from 'express';
import { addProduct, getProducts, updateProduct, deleteProduct, searchProductsController, getProductByName, getProductById, getDraftProducts, getMultiProduct, updateMultiProductDraftStatus } from '../controllers/product.controller.js';
import uploadSingleImage from '../middleware/uploadMiddleware.js';
import auth from '../middleware/auth.js';

const router = express.Router();

router.post('/add-product/:categoryId/:subCategoryId/:isMultiple',auth,uploadSingleImage, addProduct);
router.get('/get-products/:categoryId/:subCategoryId', getProducts);
router.get('/get-products-by-title/search', searchProductsController);
router.put('/update-product/:productId', uploadSingleImage, updateProduct);
router.delete('/delete-product/:productId', deleteProduct);
router.get('/get-product/:productName', getProductByName);
router.get('/get-product-by-id/:productId', getProductById);
router.get('/get-draft-products', auth, getDraftProducts);
router.get("/multi/:multiProductId", auth, getMultiProduct);
router.patch("/multi/:multiProductId/draft", auth, updateMultiProductDraftStatus);
export default router;
