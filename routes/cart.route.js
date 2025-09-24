import express from "express";
import { addToCart, getUserCart } from "../controllers/cart.controller.js";
import auth from "../middleware/auth.js";

const router = express.Router();

// Add to cart (requires authentication)
router.post("/add", auth, addToCart);

// Get all cart items for the logged-in user
router.get("/get-cart", auth, getUserCart);

export default router;