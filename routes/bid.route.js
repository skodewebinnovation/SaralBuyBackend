import express from "express";
import * as bidController from "../controllers/bid.controller.js";
import auth from "../middleware/auth.js";

const router = express.Router();


router.post("/create/:sellerId/:productId", auth, bidController.addBid);
router.get("/get-all-bid", auth, bidController.getAllBids);
router.delete("/delete-bid/:id", auth, bidController.deleteBid);
router.get('/bid-overview/:_id',auth,bidController.bidOverViewbyId)
export default router;