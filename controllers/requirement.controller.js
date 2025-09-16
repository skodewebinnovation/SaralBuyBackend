import Requirement from "../schemas/requirement.schema.js";
import productSchema from "../schemas/product.schema.js";
import { ApiResponse } from "../helper/ApiReponse.js";
import mongoose from "mongoose";

// Create a requirement (when a seller bids on a product)
export const createRequirement = async (req, res) => {
  try {
    const { productId, sellerId,buyerId, budgetAmount } = req.body;

    if (!mongoose.Types.ObjectId.isValid(productId) || !mongoose.Types.ObjectId.isValid(sellerId)) {
      return ApiResponse.errorResponse(res, 400, "Invalid productId or sellerId");
    }
    if (!buyerId) {
      return ApiResponse.errorResponse(res, 400, "Buyer not authenticated");
    }
    if (typeof budgetAmount !== "number" || isNaN(budgetAmount)) {
      return ApiResponse.errorResponse(res, 400, "Invalid budgetAmount");
    }

    // Optionally, check that the product belongs to the buyer
    const product = await productSchema.findById(productId);
    if (!product) {
      return ApiResponse.errorResponse(res, 404, "Product not found");
    }

    const requirement = new Requirement({
      productId,
      sellerId,
      buyerId,
      budgetAmount
    });

    await requirement.save();

    return ApiResponse.successResponse(res, 201, "Requirement created successfully", requirement);
  } catch (err) {
    console.error(err);
    return ApiResponse.errorResponse(res, 500, err.message || "Failed to create requirement");
  }
};

// Get all requirements for the current buyer
export const getBuyerRequirements = async (req, res) => {
    try {
      const buyerId = req.user?.userId;
      if (!buyerId) {
        return ApiResponse.errorResponse(res, 400, "Buyer not authenticated");
      }
  
      const requirements = await Requirement.aggregate([
        {
          $match: {
            buyerId: new mongoose.Types.ObjectId(buyerId)
          }
        },
        {
          $lookup: {
            from: "products",
            localField: "productId",
            foreignField: "_id",
            as: "product"
          }
        },
        { $unwind: { path: "$product", preserveNullAndEmptyArrays: true } },
  
        {
          $lookup: {
            from: "users",
            localField: "buyerId",
            foreignField: "_id",
            as: "buyer"
          }
        },
        { $unwind: { path: "$buyer", preserveNullAndEmptyArrays: true } },
  
        {
          $lookup: {
            from: "users",
            localField: "sellerId",
            foreignField: "_id",
            as: "seller"
          }
        },
        { $unwind: { path: "$seller", preserveNullAndEmptyArrays: true } },
  
        {
          $project: {
            _id: 1,
            status: 1,
            budgetAmount: 1,   // ✅ include budgetAmount
            createdAt: 1,
            updatedAt: 1,
            product: "$product", 
            buyer: "$buyer",     
            seller: "$seller"    
          }
        }
      ]).exec();
  
      return ApiResponse.successResponse(
        res,
        200,
        "Buyer requirements fetched successfully",
        requirements
      );
    } catch (err) {
      console.error(err);
      return ApiResponse.errorResponse(
        res,
        500,
        err.message || "Failed to fetch buyer requirements"
      );
    }
  };
  