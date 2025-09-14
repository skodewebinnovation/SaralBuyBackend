import Bid from "../schemas/bid.schema.js";
import mongoose from "mongoose";
import { ApiResponse } from "../helper/ApiReponse.js"
import { isValidObjectId } from "../helper/isValidId.js"
import bidSchema from "../schemas/bid.schema.js";
// Create a new bid
export const addBid = async (req, res) => {
  try {
    const { budgetQuation, status, availableBrand, earliestDeliveryDate, businessType } = req.body;
    const { sellerId, productId } = req.params;
    const buyerId = req.user.userId;

    if (!isValidObjectId(sellerId) || !isValidObjectId(productId)) {
      return ApiResponse.errorResponse(res, 400, "Invalid sellerId or productId");
    }
    if (!budgetQuation) {
      return ApiResponse.errorResponse(
        res,
        400,
        "budgetQuation is required"
      );
    }

    const bid = await Bid.create({
      sellerId,
      buyerId,
      productId,
      budgetQuation,
      status: status || "active",
      availableBrand,
      earliestDeliveryDate,
      businessType
    });
    return ApiResponse.successResponse(
      res,
      200,
      "Bid created successfully",
      bid
    );
  } catch (err) {
    return ApiResponse.errorResponse(
      res,
      400,
      err.message || "Something went wrong while creating bid"
    );
  }
};

// Get all bids for the logged-in user (buyer)
export const getAllBids = async (req, res) => {
  try {
    const buyerId = req.user.userId;

    const bids = await Bid.aggregate([
      {
        $match: {
          buyerId: new mongoose.Types.ObjectId(buyerId),
        },
      },
      {
        $lookup: {
          from: "products",
          localField: "productId",
          foreignField: "_id",
          as: "product",
        },
      },
      { $unwind: "$product" },

      {
        $lookup: {
          from: "users",
          localField: "sellerId",
          foreignField: "_id",
          as: "seller",
        },
      },
      { $unwind: "$seller" },

      {
        $lookup: {
          from: "users",
          localField: "buyerId",
          foreignField: "_id",
          as: "buyer",
        },
      },
      { $unwind: "$buyer" },

      {
        $project: {
          _id: 1,
          budgetQuation: 1,
          status: 1,
          createdAt: 1,
          updatedAt: 1,
          product: 1,
          seller: {
            _id: 1,
            firstName: 1,
            lastName: 1,
            email: 1,
            phone: 1,
          },
          buyer: {
            _id: 1,
            firstName: 1,
            lastName: 1,
            email: 1,
            phone: 1,
          },
        },
      },
    ])

    return ApiResponse.successResponse(
      res,
      200,
      "All bids fetched successfully",
      bids
    );
  } catch (err) {
    return ApiResponse.errorResponse(
      res,
      400,
      err.message || "Something went wrong while fetching bids"
    );
  }
};


// Delete a bid (only if the logged-in user is the buyer)
export const deleteBid = async (req, res) => {
  try {
    const { id } = req.params;
    const buyerId = req.user.userId;

    const bid = await Bid.findOne({ _id: id, buyerId });
    if (!bid) {
      return ApiResponse.errorResponse(
        res,
        403,
        "Not authorized to delete this bid"
      );
    }

    await Bid.deleteOne({ _id: id });
    return ApiResponse.successResponse(
      res,
      200,
      "Bid deleted successfully"
    );
  } catch (err) {
    return ApiResponse.errorResponse(
      res,
      400,
      err.message || "Something went wrong while deleting bid"
    );
  }
};
export const bidOverViewbyId = async (req, res) => {
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    return ApiResponse.errorResponse(res, 400, "Invalid bid or product id");
  }

  try {
    const bid = await bidSchema.aggregate([
      {
        $match: {
          _id: new mongoose.Types.ObjectId(id)
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
      { $unwind: "$product" },

      {
        $lookup: {
          from: "categories",
          let: { categoryId: "$product.categoryId" },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$_id", "$$categoryId"] }
              }
            }
          ],
          as: "productCategory"
        }
      },
      { $unwind: { path: "$productCategory", preserveNullAndEmptyArrays: true } },

      {
        $addFields: {
          "product.category": "$productCategory"
        }
      },
      {
        $project: {
          productCategory: 0
        }
      },
      {
        $addFields: {
          "product.subCategory": {
            $arrayElemAt: [
              {
                $filter: {
                  input: "$product.category.subCategories",
                  as: "sub",
                  cond: { $eq: ["$$sub._id", "$product.subCategoryId"] }
                }
              },
              0
            ]
          }
        }
      },
      {
        $lookup: {
          from: "users",
          localField: "buyerId",
          foreignField: "_id",
          as: "seller"
        }
      },
      { $unwind: "$seller" },

      {
        $lookup: {
          from: "users",
          localField: "sellerId",
          foreignField: "_id",
          as: "buyer"
        }
      },
      { $unwind: "$buyer" },

      {
        $project: {
          productId: 0,
          sellerId: 0,
          buyerId: 0,
          "product.categoryId": 0,
          "product.subCategoryId": 0,
        }
      }
    ]);

    if (!bid.length) {
      return ApiResponse.errorResponse(res, 404, "Bid not found");
    }

    return ApiResponse.successResponse(res, 200, "Bid overview", bid[0]);

  } catch (err) {
    return ApiResponse.errorResponse(res, 500, err.message || "Something went wrong while getting bid overview");
  }
};


export const updateBidUserDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      budgetQuation,
      availableBrand,
      earliestDeliveryDate
    } = req.body;

    const bid = await bidSchema.findByIdAndUpdate(id, { budgetQuation, availableBrand, earliestDeliveryDate }, { new: true });

    if (!bid) {
      return ApiResponse.errorResponse(res, 404, "Bid not found");
    }

    return ApiResponse.successResponse(res, 200, "Bid updated successfully", bid);

  } catch (err) {
    return ApiResponse.errorResponse(res, 500, err.message || "Something went wrong while updating bid");
  }
}

export const getLatestThreeBid = async(req,res)=>{
  try {
    const user =req.user._id
    if(!user){
      return ApiResponse.errorResponse(res, 404, "User not found");
    }
    const bids = await bidSchema.find({sellerId:user}).sort({ createdAt: -1 }).limit(3).populate({
      path:'productId',
      populate:{
        path:'categoryId'
      }
    }).lean()
    if (!bids) {
      return ApiResponse.errorResponse(res, 404, "Bid not found");
    }
    return ApiResponse.successResponse(res, 200, "Bid fetched successfully", bids);
  } catch (error) {
    console.log(error)
    return ApiResponse.errorResponse(res, 400, "Something went wrong while getting bid overview");
    
  }

}