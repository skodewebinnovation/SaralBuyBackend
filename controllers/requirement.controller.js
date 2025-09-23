import Requirement from "../schemas/requirement.schema.js";
import productSchema from "../schemas/product.schema.js";
import multiProductSchema from "../schemas/multiProduct.schema.js";
import { ApiResponse } from "../helper/ApiReponse.js";
import mongoose from "mongoose";
import requirementSchema from "../schemas/requirement.schema.js";

// Create a requirement (when a seller bids on a product)
export const createRequirement = async (req, res) => {
  try {
    const { productId, sellerId, buyerId, budgetAmount } = req.body;

    if (!mongoose.Types.ObjectId.isValid(productId) || !mongoose.Types.ObjectId.isValid(sellerId)) {
      return ApiResponse.errorResponse(res, 400, "Invalid productId or sellerId");
    }
    if (!buyerId || !mongoose.Types.ObjectId.isValid(buyerId)) {
      return ApiResponse.errorResponse(res, 400, "Invalid buyerId");
    }
    if (typeof budgetAmount !== "number" || isNaN(budgetAmount)) {
      return ApiResponse.errorResponse(res, 400, "Invalid budgetAmount");
    }

    // check product exists
    const product = await productSchema.findById(productId);
    if (!product) {
      return ApiResponse.errorResponse(res, 404, "Product not found");
    }

    // check if requirement for this product & buyer exists
    let requirement = await requirementSchema.findOne({ productId, buyerId });

    if (requirement) {
      // check if seller already exists in sellers array
      const existingSeller = requirement.sellers.find(
        (s) => s.sellerId.toString() === sellerId
      );

      if (existingSeller) {
        // update budgetAmount if seller already exists
        existingSeller.budgetAmount = budgetAmount;
      } else {
        // add new seller entry
        requirement.sellers.push({ sellerId, budgetAmount });
      }

      await requirement.save();
      return ApiResponse.successResponse(res, 200, "Requirement updated successfully", requirement);
    } else {
      // create new requirement with sellers array
      requirement = new requirementSchema({
        productId,
        buyerId,
        sellers: [{ sellerId, budgetAmount }]
      });

      await requirement.save();
      return ApiResponse.successResponse(res, 201, "Requirement created successfully", requirement);
    }
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

    // Fetch requirements with populated product + sellers
    const requirements = await Requirement.find({ buyerId })
      .populate({
        path: "productId",
        populate: { path: "categoryId", select: "-subCategories" },
      })
      .populate("buyerId")
      .populate({
        path: "sellers.sellerId",
        select: "-password -__v", // exclude sensitive fields
      })
      .lean();

    // Helper to clean product data
    const cleanProduct = (prod) => {
      if (!prod) return prod;
      const p = { ...prod };

      if (p.userId?._id) p.userId = p.userId._id.toString();
      if (p.subCategoryId?._id) p.subCategoryId = p.subCategoryId._id;

      delete p.__v;
      return p;
    };

    // Manual date formatter
    const formatDate = (date) => {
      if (!date) return null;
      const d = new Date(date);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0"); // months are 0-based
      const day = String(d.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    };

    // Process requirements
    const enhancedRequirements = await Promise.all(
      requirements.map(async (requirement) => {
        const responseObj = {
          _id: requirement._id,
          status: requirement.status,
          createdAt: requirement.createdAt,
          updatedAt: requirement.updatedAt,
          product: requirement.productId,
          buyer: requirement.buyerId,
          sellers:
            requirement.sellers?.map((s) => ({
              seller: s.sellerId, // full populated seller object
              budgetAmount: s.budgetAmount,
              date: formatDate(s.createdAt || requirement.createdAt), // use seller's createdAt if available
            })) || [],
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
              { subProducts: responseObj.product._id },
            ],
          })
          .populate({
            path: "mainProductId",
            populate: { path: "categoryId", select: "-subCategories" },
          })
          .populate({
            path: "subProducts",
            populate: { path: "categoryId", select: "-subCategories" },
          })
          .lean();

        if (multiProduct?.mainProductId) {
          const mainIdStr = multiProduct.mainProductId._id.toString();
          const cleanedMainProduct = cleanProduct(multiProduct.mainProductId);

          // Filter & clean subProducts (exclude main product)
          const subProductsOnly = (multiProduct.subProducts || [])
            .filter((sub) => sub._id.toString() !== mainIdStr)
            .map(cleanProduct);

          responseObj.product = {
            ...cleanedMainProduct,
            subProducts: subProductsOnly,
          };
        } else {
          // Single product case
          responseObj.product = {
            ...cleanProduct(responseObj.product),
            subProducts: [],
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
export const getRecentRequirements = async(req,res)=>{
  try {
    const requirements = await requirementSchema.find().sort({ createdAt: -1 }).limit(3).populate([
      {path:'productId',select:'title quantity image',populate:{path:"categoryId",select:"categoryName"}},
      {path:'buyerId',select:"firstName lastName currentLocation"},
    ]).select('createdAt').lean();
    return ApiResponse.successResponse(res, 200, "Requirements fetched successfully", requirements);
  } catch (error) {
    console.log(error)
    return ApiResponse.errorResponse(res, 400, "Something went wrong while getting requirements");
    
  }
}


// Get all requirements with dealStatus "completed", requirementApproved true, isDelete false, and buyerId = logged-in user
export const getCompletedApprovedRequirements = async (req, res) => {
  try {
    const buyerId = req.user?.userId;
    if (!buyerId) {
      return ApiResponse.errorResponse(res, 400, "User not authenticated");
    }

    const requirements = await Requirement.find({
      dealStatus: "completed",
      requirementApproved: true,
      isDelete: false,
      buyerId: buyerId
    })
      .populate({
        path: "productId",
        populate: { path: "categoryId", select: "-subCategories" }
      })
      .populate("buyerId")
      .populate({
        path: "sellers.sellerId",
        select: "-password -__v"
      })
      .lean();

    // Helper to clean product data
    const cleanProduct = (prod) => {
      if (!prod) return prod;
      const p = { ...prod };
      if (p.userId?._id) p.userId = p.userId._id.toString();
      if (p.subCategoryId?._id) p.subCategoryId = p.subCategoryId._id;
      delete p.__v;
      return p;
    };

    // For each requirement, check if product is part of a multiProduct
    const enhancedRequirements = await Promise.all(
      requirements.map(async (requirement) => {
        const responseObj = {
          _id: requirement._id,
          status: requirement.status,
          createdAt: requirement.createdAt,
          updatedAt: requirement.updatedAt,
          product: requirement.productId,
          buyer: requirement.buyerId,
          sellers:
            requirement.sellers?.map((s) => ({
              seller: s.sellerId,
              budgetAmount: s.budgetAmount,
              date: s.createdAt || requirement.createdAt,
            })) || [],
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
              { subProducts: responseObj.product._id },
            ],
          })
          .populate({
            path: "mainProductId",
            populate: { path: "categoryId", select: "-subCategories" },
          })
          .populate({
            path: "subProducts",
            populate: { path: "categoryId", select: "-subCategories" },
          })
          .lean();

        if (multiProduct?.mainProductId) {
          const mainIdStr = multiProduct.mainProductId._id.toString();
          const cleanedMainProduct = cleanProduct(multiProduct.mainProductId);

          // Filter & clean subProducts (exclude main product)
          const subProductsOnly = (multiProduct.subProducts || [])
            .filter((sub) => sub._id.toString() !== mainIdStr)
            .map(cleanProduct);

          responseObj.product = {
            ...cleanedMainProduct,
            subProducts: subProductsOnly,
          };
        } else {
          // Single product case
          responseObj.product = {
            ...cleanProduct(responseObj.product),
            subProducts: [],
          };
        }

        return responseObj;
      })
    );

    return ApiResponse.successResponse(
      res,
      200,
      "Completed approved requirements fetched successfully",
      enhancedRequirements
    );
  } catch (err) {
    console.error(err);
    return ApiResponse.errorResponse(
      res,
      500,
      err.message || "Failed to fetch completed approved requirements"
    );
  }
};
// Get all requirements with dealStatus "pending", requirementApproved true, isDelete false
export const getApprovedPendingRequirements = async (req, res) => {
  try {
    // Find requirements with the specified filters
    const requirements = await Requirement.find({
      dealStatus: "pending",
      requirementApproved: true,
      isDelete: false
    })
      .populate({
        path: "productId",
        populate: { path: "categoryId", select: "-subCategories" }
      })
      .populate("buyerId")
      .populate({
        path: "sellers.sellerId",
        select: "-password -__v"
      })
      .lean();

    // Helper to clean product data
    const cleanProduct = (prod) => {
      if (!prod) return prod;
      const p = { ...prod };
      if (p.userId?._id) p.userId = p.userId._id.toString();
      if (p.subCategoryId?._id) p.subCategoryId = p.subCategoryId._id;
      delete p.__v;
      return p;
    };

    // For each requirement, check if product is part of a multiProduct
    const enhancedRequirements = await Promise.all(
      requirements.map(async (requirement) => {
        const responseObj = {
          _id: requirement._id,
          status: requirement.status,
          createdAt: requirement.createdAt,
          updatedAt: requirement.updatedAt,
          product: requirement.productId,
          buyer: requirement.buyerId,
          sellers:
            requirement.sellers?.map((s) => ({
              seller: s.sellerId,
              budgetAmount: s.budgetAmount,
              date: s.createdAt || requirement.createdAt,
            })) || [],
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
              { subProducts: responseObj.product._id },
            ],
          })
          .populate({
            path: "mainProductId",
            populate: { path: "categoryId", select: "-subCategories" },
          })
          .populate({
            path: "subProducts",
            populate: { path: "categoryId", select: "-subCategories" },
          })
          .lean();

        if (multiProduct?.mainProductId) {
          const mainIdStr = multiProduct.mainProductId._id.toString();
          const cleanedMainProduct = cleanProduct(multiProduct.mainProductId);

          // Filter & clean subProducts (exclude main product)
          const subProductsOnly = (multiProduct.subProducts || [])
            .filter((sub) => sub._id.toString() !== mainIdStr)
            .map(cleanProduct);

          responseObj.product = {
            ...cleanedMainProduct,
            subProducts: subProductsOnly,
          };
        } else {
          // Single product case
          responseObj.product = {
            ...cleanProduct(responseObj.product),
            subProducts: [],
          };
        }

        return responseObj;
      })
    );

    return ApiResponse.successResponse(
      res,
      200,
      "Approved pending requirements fetched successfully",
      enhancedRequirements
    );
  } catch (err) {
    console.error(err);
    return ApiResponse.errorResponse(
      res,
      500,
      err.message || "Failed to fetch approved pending requirements"
    );
  }
};
  
// Close a deal (mark as completed and store deal info)
export const closeDeal = async (req, res) => {
  try {
    const { productId, buyerId, sellerId, budgetAmount } = req.body;

    if (!mongoose.Types.ObjectId.isValid(productId) ||
        !mongoose.Types.ObjectId.isValid(buyerId) ||
        !mongoose.Types.ObjectId.isValid(sellerId)) {
      return ApiResponse.errorResponse(res, 400, "Invalid productId, buyerId, or sellerId");
    }
    if (typeof budgetAmount !== "number" || isNaN(budgetAmount)) {
      return ApiResponse.errorResponse(res, 400, "Invalid budgetAmount");
    }

    // Find the requirement
    const requirement = await requirementSchema.findOne({ productId, buyerId });
    if (!requirement) {
      return ApiResponse.errorResponse(res, 404, "Requirement not found");
    }

    // Mark deal as completed
    requirement.dealStatus = "completed";
    // Optionally, store closed deal info (could be extended for history)
    requirement.closedDeal = {
      buyerId,
      sellerId,
      productId,
      budgetAmount,
      closedAt: new Date()
    };

    await requirement.save();

    return ApiResponse.successResponse(res, 200, "Deal closed successfully", requirement);
  } catch (err) {
    console.error(err);
    return ApiResponse.errorResponse(res, 500, err.message || "Failed to close deal");
  }
};
// Utility to approve requirement when chat starts (for product owner/buyer)
export const approveRequirementOnChatStart = async ({ productId, userId }) => {
  try {
    if (!productId || !userId) {
      return { updated: false, reason: "Missing productId or userId" };
    }

    // Find the product
    const product = await productSchema.findById(productId).lean();
    if (!product) {
      return { updated: false, reason: "Product not found" };
    }

    // Check if the user is the product owner (buyer)
    if (String(product.userId) !== String(userId)) {
      return { updated: false, reason: "User is not the product owner" };
    }

    // Find the requirement for this product and buyer
    const requirement = await Requirement.findOne({ productId, buyerId: userId });
    if (!requirement) {
      return { updated: false, reason: "Requirement not found" };
    }

    if (requirement.requirementApproved) {
      return { updated: false, reason: "Already approved" };
    }

    requirement.requirementApproved = true;
    await requirement.save();
    return { updated: true };
  } catch (err) {
    return { updated: false, reason: err.message || "Error updating requirement" };
  }
};
