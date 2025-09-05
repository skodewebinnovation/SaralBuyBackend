import mongoose from "mongoose";
import categorySchema from "../schemas/category.schema.js";
import productSchema from "../schemas/product.schema.js";
import { ApiResponse } from "../helper/ApiReponse.js"
import { v2 as cloudinary } from "cloudinary";
import userSchema from "../schemas/user.schema.js";
import {isValidObjectId}  from "../helper/isValidId.js"




export const addProduct = async (req, res) => {
  const { categoryId, subCategoryId } = req.params;
  const userId = req.user?.userId;

  try {
    // ✅ Validate IDs
    if (!categoryId || !mongoose.Types.ObjectId.isValid(categoryId)) {
      return ApiResponse.errorResponse(res, 400, "Invalid or missing categoryId");
    }
    if (!subCategoryId || !mongoose.Types.ObjectId.isValid(subCategoryId)) {
      return ApiResponse.errorResponse(res, 400, "Invalid or missing subCategoryId");
    }
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return ApiResponse.errorResponse(res, 400, "Invalid or missing userId");
    }

    const imageFile = req.files?.image?.[0];
    const documentFile = req.files?.document?.[0];
    const imageUrl = imageFile?.path || imageFile?.url || null;
    const documentUrl = documentFile?.path || documentFile?.url || null;

    let {
      title,
      quantity,
      minimumBudget,
      productType,
      oldProductValue,
      productCondition,
      description,
      draft,
      gst_requirement,
      paymentAndDelivery,

      // ✅ New fields
      color,
      selectCategory,
      brand,
      additionalDeliveryAndPackage,
      fuelType,
      model,
      transmission,
      productCategory,
      gender,
      typeOfAccessories,
      constructionToolType,
      toolType,
      rateAService,
    } = req.body;

    // ✅ Required field validation
    if (!title?.trim() || !quantity || !minimumBudget || !description?.trim()) {
      return ApiResponse.errorResponse(res, 400, "Title, quantity, minimum budget, and description are required");
    }
    if(oldProductValue){
      try {
        if(typeof oldProductValue === "string"){
          oldProductValue = JSON.parse(oldProductValue)
        }
      } catch (error) {
        return ApiResponse.errorResponse(res, 400, "Invalid old product value");
        
      }
    }
    if(paymentAndDelivery){
      try {
        if(typeof paymentAndDelivery === "string"){
          paymentAndDelivery = JSON.parse(paymentAndDelivery)
        }
      } catch (error) {
        return ApiResponse.errorResponse(res, 400, "Invalid payment and delivery");

      }
    }

    // ✅ Build product object dynamically (only store non-empty values)
    const productData = {
      title: title?.trim(),
      quantity,
      minimumBudget,
      productType,
      description: description?.trim(),
      draft: draft || false,
      categoryId: new mongoose.Types.ObjectId(categoryId),
      subCategoryId: new mongoose.Types.ObjectId(subCategoryId),
      userId: new mongoose.Types.ObjectId(userId),
      ...(imageUrl && { image: imageUrl }),
      ...(documentUrl && { document: documentUrl }),
      ...(color && { color }),
      ...(selectCategory && { selectCategory }),
      ...(brand && { brand }),
      ...(additionalDeliveryAndPackage && { additionalDeliveryAndPackage }),
      ...(fuelType && { fuelType }),
      ...(model && { model }),
      ...(transmission && { transmission }),
      ...(productCategory && { productCategory }),
      ...(gender && { gender }),
      ...(typeOfAccessories && { typeOfAccessories }),
      ...(constructionToolType && { constructionToolType }),
      ...(toolType && { toolType }),
      ...(rateAService && { rateAService }),

      paymentAndDelivery: {
        ...(paymentAndDelivery?.ex_deliveryDate && { ex_deliveryDate: paymentAndDelivery.ex_deliveryDate }),
        ...(paymentAndDelivery?.paymentMode && { paymentMode: paymentAndDelivery.paymentMode }),
        ...(gst_requirement === "yes" && paymentAndDelivery?.gstNumber && { gstNumber: paymentAndDelivery.gstNumber }),
        ...(gst_requirement === "yes" && paymentAndDelivery?.organizationName && { organizationName: paymentAndDelivery.organizationName }),
        ...(gst_requirement === "yes" && paymentAndDelivery?.organizationAddress && { organizationAddress: paymentAndDelivery.organizationAddress }),
      },
    };

    if (productType === "old_product") {
      if (oldProductValue?.min || oldProductValue?.max) {
        productData.oldProductValue = {
          ...(oldProductValue?.min && { min: oldProductValue.min }),
          ...(oldProductValue?.max && { max: oldProductValue.max }),
        };
      }
      if (productCondition) {
        productData.productCondition = productCondition;
      }
    }

    // ✅ Save product
    const newProduct = new productSchema(productData);
    const savedProduct = await newProduct.save();

    // ✅ Push product into category.subCategories[].products
    const updatedCategory = await categorySchema.findOneAndUpdate(
      { _id: categoryId, "subCategories._id": subCategoryId },
      { $push: { "subCategories.$.products": savedProduct._id } },
      { new: true }
    );

    if (!updatedCategory) {
      return ApiResponse.errorResponse(res, 404, "Category or SubCategory not found");
    }

    return ApiResponse.successResponse(
      res,
      201,
      "Product created successfully and added to subCategory",
      savedProduct
    );
  } catch (err) {
    console.error(err);
    return ApiResponse.errorResponse(
      res,
      400,
      err.message || "Something went wrong while creating product"
    );
  }
};



export const getProducts = async (req, res) => {
    try {
        const { categoryId, subCategoryId } = req.params
        const { skip = 0, limit = 10 } = req.query; 
        const skipValue = parseInt(skip, 10);
        const limitValue = parseInt(limit, 10);

        let filter = {};

        if (subCategoryId) {
            const category = await categorySchema.findOne({ "subCategories._id": subCategoryId });
            if (!category) return ApiResponse.errorResponse(res, 404, "Subcategory not found");

            const subCategory = category.subCategories.id(subCategoryId);
            filter._id = { $in: subCategory.products };
        } else if (categoryId) {
            const category = await categorySchema.findById(categoryId);
            if (!category) return ApiResponse.errorResponse(res, 404, "Category not found");

            const productIds = category.subCategories.reduce((acc, sub) => acc.concat(sub.products), []);
            filter._id = { $in: productIds };
        }

        const total = await productSchema.countDocuments(filter);
        // Apply skip & limit for pagination
        const products = await productSchema.find(filter).skip(skipValue).limit(limitValue)

        return ApiResponse.successResponse(res, 200, "Products fetched successfully", { total, products });
    } catch (error) {
        return ApiResponse.errorResponse(res, 500, error.message);
    }
};


export const searchProductsController = async (req, res) => {
  try {
    const { title, page = 1, limit = 10, skip } = req.query;

    if (!title || typeof title !== "string" || title.trim().length < 2) {
      return ApiResponse.errorResponse(res, 400, "Valid product title is required (min 2 characters)");
    }

    const limitValue = Math.max(parseInt(limit, 10), 1);
    const pageValue = Math.max(parseInt(page, 10), 1);
    const skipValue = skip ? parseInt(skip, 10) : (pageValue - 1) * limitValue;

    const words = title.trim().split(/\s+/);

    const strongFilter = {
      $and: words.map((word) => ({
        title: { $regex: `\\b${word}\\b`, $options: "i" },
      })),
    };

    const weakFilter = {
      $or: words.map((word) => ({
        title: { $regex: word, $options: "i" },
      })),
    };

    let products = await productSchema.find(strongFilter).skip(skipValue).limit(limitValue).populate({
      path:'userId',
      select:"firstName lastName address"
    }).populate({
      path:'categoryId',
      select:'categoryName'
    })
    let total = await productSchema.countDocuments(strongFilter);

    if (products.length === 0) {
      products = await productSchema.find(weakFilter).skip(skipValue).limit(limitValue);
      total = await productSchema.countDocuments(weakFilter);
    }

    return ApiResponse.successResponse(res, 200, "Products fetched successfully", {
      total,
      totalPages: Math.ceil(total / limitValue),
      page: pageValue,
      limit: limitValue,
      skip: skipValue,
      products,
    });
  } catch (error) {
    console.error("Error in searchProductsController:", error);
    return ApiResponse.errorResponse(res, 500, "Internal server error");
  }
};

export const updateProduct = async (req, res) => {
  try {
    const { productId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return ApiResponse.errorResponse(res, 400, "Invalid product ID");
    }

    const imageFile = req.files?.image?.[0];
    const documentFile = req.files?.document?.[0];
    const imageUrl = imageFile?.path || imageFile?.url || null;
    const documentUrl = documentFile?.path || documentFile?.url || null;

    const {
      title,
      quantity,
      minimumBudget,
      productType,
      oldProductValue,
      productCondition,
      description,
      draft,
      gst_requirement,
      paymentAndDelivery,
      color,
      selectCategory,
      brand,
      additionalDeliveryAndPackage,
      fuelType,
      model,
      transmission,
      productCategory,
      gender,
      typeOfAccessories,
      constructionToolType,
      toolType,
      rateAService,
    } = req.body;

    const updateData = {
      ...(title?.trim() && { title: title.trim() }),
      ...(quantity && { quantity }),
      ...(minimumBudget && { minimumBudget }),
      ...(productType && { productType }),
      ...(description?.trim() && { description: description.trim() }),
      ...(draft !== undefined && { draft }),
      ...(imageUrl && { image: imageUrl }),
      ...(documentUrl && { document: documentUrl }),
      ...(color && { color }),
      ...(selectCategory && { selectCategory }),
      ...(brand && { brand }),
      ...(additionalDeliveryAndPackage && { additionalDeliveryAndPackage }),
      ...(fuelType && { fuelType }),
      ...(model && { model }),
      ...(transmission && { transmission }),
      ...(productCategory && { productCategory }),
      ...(gender && { gender }),
      ...(typeOfAccessories && { typeOfAccessories }),
      ...(constructionToolType && { constructionToolType }),
      ...(toolType && { toolType }),
      ...(rateAService && { rateAService }),
    };

    if (productType === "old_product") {
      if (oldProductValue?.min || oldProductValue?.max) {
        updateData.oldProductValue = {
          ...(oldProductValue?.min && { min: oldProductValue.min }),
          ...(oldProductValue?.max && { max: oldProductValue.max }),
        };
      }
      if (productCondition) {
        updateData.productCondition = productCondition;
      }
    }

    if (paymentAndDelivery || gst_requirement === "yes") {
      updateData.paymentAndDelivery = {
        ...(paymentAndDelivery?.ex_deliveryDate && { ex_deliveryDate: paymentAndDelivery.ex_deliveryDate }),
        ...(paymentAndDelivery?.paymentMode && { paymentMode: paymentAndDelivery.paymentMode }),
        ...(gst_requirement === "yes" && paymentAndDelivery?.gstNumber && { gstNumber: paymentAndDelivery.gstNumber }),
        ...(gst_requirement === "yes" && paymentAndDelivery?.organizationName && { organizationName: paymentAndDelivery.organizationName }),
        ...(gst_requirement === "yes" && paymentAndDelivery?.organizationAddress && { organizationAddress: paymentAndDelivery.organizationAddress }),
      };
    }

    const updatedProduct = await productSchema.findByIdAndUpdate(productId, updateData, { new: true });
    if (!updatedProduct) {
      return ApiResponse.errorResponse(res, 404, "Product not found");
    }

    return ApiResponse.successResponse(res, 200, "Product updated successfully", updatedProduct);
  } catch (error) {
    console.error(error);
    return ApiResponse.errorResponse(res, 500, error.message || "Something went wrong while updating product");
  }
};

export const deleteProduct = async (req, res) => {
    try {
        const { productId } = req.params;
        const { categoryId, subCategoryId } = req.body;

        if (!isValidObjectId(productId)) return ApiResponse.errorResponse(res, 400, "Invalid product ID");

        const product = await productSchema.findByIdAndDelete(productId);
        if (!product) return ApiResponse.errorResponse(res, 404, "Product not found");

        if (categoryId && subCategoryId) {
            const category = await categorySchema.findById(categoryId);
            if (category) {
                const subCategory = category.subCategories.id(subCategoryId);
                if (subCategory) {
                    subCategory.products.pull(productId);
                    await category.save();
                }
            }
        }

        return ApiResponse.successResponse(res, 200, "Product deleted successfully");
    } catch (error) {
        return ApiResponse.errorResponse(res, 500, error.message);
    }
};

export const getProductByName = async (req, res) => {
  try {
    const { productName } = req.params;
        if (!productName) return ApiResponse.successResponse(res, 200,'empty query',[]);
    const products = await productSchema.find({
      title: { $regex: productName, $options: "i"},  
    },{
        title:1,
        image:1,
        description:1
      }).populate({
      path:'userId',
      select:"firstName lastName address"
    }).populate({
      path:'categoryId',
      select:'categoryName'
    }).lean();
    return ApiResponse.successResponse(res, 200,'products found',products);
  } catch (error) {
    console.error(error);
    return ApiResponse.errorResponse(res, 400, error.message,null);
  }
};

// Get product by ID
export const getProductById = async (req, res) => {
  try {
    const { productId } = req.params;
    if (!isValidObjectId(productId)) {
      return ApiResponse.errorResponse(res, 400, "Invalid product ID");
    }
    let product = await productSchema.findById(productId).populate({
      path:'userId',
      select:"firstName lastName address"
    }).populate({
      path:'categoryId',
      select:'categoryName subCategories'
    })

    if (!product) {
      return ApiResponse.errorResponse(res, 404, "Product not found");
    }
     const populatedSubCategory = product.categoryId.subCategories.find(
      sub => sub._id.toString() === product.subCategoryId.toString()
    );

    product = product.toObject(); 
    product.subCategoryId = populatedSubCategory || product.subCategoryId;
    
   
    return ApiResponse.successResponse(res, 200, "Product found", product);
  } catch (error) {
    console.error(error);
    return ApiResponse.errorResponse(res, 500, error.message);
  }
};
