import express from "express";
import * as requirementController from "../controllers/requirement.controller.js";
import auth from "../middleware/auth.js";

const router = express.Router();

// Create a requirement (when a seller bids on a product)
router.post("/create", auth, requirementController.createRequirement);

// Get all requirements for the current buyer
router.get("/my-requirements", auth, requirementController.getBuyerRequirements);
router.get('/recent-requirements', requirementController.getRecentRequirements)

export default router;