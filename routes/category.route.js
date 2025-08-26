import express from 'express'
import { CreateCategories ,GetCategories, UpdateCategory} from '../controllers/category.controller.js'
import uploadSingleImage from '../middleware/uploadMiddleware.js'
const router = express.Router()


router.post('/create-category',uploadSingleImage,CreateCategories)
router.put('/update-category/:categoryId',uploadSingleImage,UpdateCategory)
router.get('/get-category',GetCategories)

export default router