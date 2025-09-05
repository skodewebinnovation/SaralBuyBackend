import express from "express";
import * as bidController from "../controllers/bid.controller.js";
import auth from "../middleware/auth.js";

const router = express.Router();

// Create a new bid
router.post("/create/:sellerId/:productId", auth, bidController.addBid);

// Get all bids for the logged-in user
router.get("/get-all-bid", auth, bidController.getAllBids);

// Delete a bid by id (only if owned by user)
router.delete("/delete-bid/:id", auth, bidController.deleteBid);

export default router;