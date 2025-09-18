import Requirement from "../schemas/requirement.schema.js";
import productSchema from "../schemas/product.schema.js";
import multiProductSchema from "../schemas/multiProduct.schema.js";
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

    // Fetch requirements with populated fields
    const requirements = await Requirement.find({ buyerId })
      .populate('productId')
      .populate('buyerId')
      .populate('sellerId')
      .lean();

    // Helper function to clean product data
    const cleanProduct = (prod) => {
      if (!prod) return prod;
      const p = { ...prod };
      
      if (p.userId?._id) p.userId = p.userId._id.toString();
      if (p.subCategoryId?._id) p.subCategoryId = p.subCategoryId._id;
      
      delete p.__v;
      return p;
    };

    // Process requirements with multiProduct enhancement
    const enhancedRequirements = await Promise.all(
      requirements.map(async (requirement) => {
        // Structure the response object
        const responseObj = {
          _id: requirement._id,
          status: requirement.status,
          budgetAmount: requirement.budgetAmount,
          createdAt: requirement.createdAt,
          updatedAt: requirement.updatedAt,
          product: requirement.productId,
          buyer: requirement.buyerId,
          seller: requirement.sellerId
        };

        if (!responseObj.product?._id) {
          responseObj.product = null;
          return responseObj;
        }

        // Find multiProduct containing this product
        const multiProduct = await multiProductSchema
          .findOne({
            $or: [
              { mainProductId: responseObj.product._id },
              { subProducts: responseObj.product._id }
            ]
          })
          .populate({
            path: 'mainProductId',
            populate: { path: 'categoryId', select: '-subCategories' }
          })
          .populate({
            path: 'subProducts',
            populate: { path: 'categoryId', select: '-subCategories' }
          })
          .lean();

        if (multiProduct?.mainProductId) {
          const mainIdStr = multiProduct.mainProductId._id.toString();
          const cleanedMainProduct = cleanProduct(multiProduct.mainProductId);
          
          // Filter and clean subProducts (exclude main product)
          const subProductsOnly = (multiProduct.subProducts || [])
            .filter(sub => sub._id.toString() !== mainIdStr)
            .map(cleanProduct);
          
          responseObj.product = {
            ...cleanedMainProduct,
            subProducts: subProductsOnly
          };
        } else {
          // Single product case
          responseObj.product = {
            ...cleanProduct(responseObj.product),
            subProducts: []
          };
        }

        return responseObj;
      })
    );

    return ApiResponse.successResponse(
      res,
      200,
      "Buyer requirements fetched successfully",
      enhancedRequirements
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
  