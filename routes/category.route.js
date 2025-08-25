import express from 'express'
import { CreateCategories ,GetCategories} from '../controllers/category.controller.js'
const router = express.Router()


router.post('/create-category',CreateCategories)
router.get('/get-category',GetCategories)

export default router