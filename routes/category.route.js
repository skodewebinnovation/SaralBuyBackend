import express from 'express'
import { CreateCategories } from '../controllers/category.controller.js'
const router = express.Router()


router.post('/create-category',CreateCategories)

export default router