import mongoose from "mongoose";
import categorySchema from "../schemas/category.schema.js";
import productSchema from "../schemas/product.schema.js";
import { ApiResponse } from "../helper/ApiReponse.js"
import { v2 as cloudinary } from "cloudinary";
import userSchema from "../schemas/user.schema.js";
import {isValidObjectId}  from "../helper/isValidId.js"
import multiProductSchema from "../schemas/multiProduct.schema.js";

const processProductData = (productData, imageUrl, documentUrl, categoryId, subCategoryId, userId, draft) => {
  const {
    title,
    quantity,
    minimumBudget,
    productType,
    oldProductValue,
    productCondition,
    description,
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
    toolType,
    rateAService,
    conditionOfProduct
  } = productData;

  const isMeaningfulValue = (value) => {
    if (value === null || value === undefined) return false;
    if (typeof value === 'string' && value.trim() === '') return false;
    if (typeof value === 'number' && isNaN(value)) return false;
    return true;
  };

  // Parse JSON fields if they are strings
  let parsedOldProductValue = oldProductValue;
  if (oldProductValue && typeof oldProductValue === "string") {
    try {
      parsedOldProductValue = JSON.parse(oldProductValue);
    } catch (error) {
      parsedOldProductValue = oldProductValue;
    }
  }
  
  let parsedPaymentAndDelivery = paymentAndDelivery;
  if (paymentAndDelivery && typeof paymentAndDelivery === "string") {
    try {
      parsedPaymentAndDelivery = JSON.parse(paymentAndDelivery);
    } catch (error) {
      parsedPaymentAndDelivery = paymentAndDelivery;
    }
  }

  // Build base product object with required fields
  const processedData = {
    draft: draft || false,
    categoryId: new mongoose.Types.ObjectId(categoryId),
    subCategoryId: new mongoose.Types.ObjectId(subCategoryId),
    userId: new mongoose.Types.ObjectId(userId),
  };

  // Only include fields present in productData (req.body), for both draft and non-draft
  const allowedFields = [
    "title", "quantity", "minimumBudget", "productType", "oldProductValue", "productCondition",
    "description", "gst_requirement", "paymentAndDelivery", "color", "selectCategory", "brand",
    "additionalDeliveryAndPackage", "fuelType", "model", "transmission", "productCategory",
    "gender", "typeOfAccessories", "toolType", "rateAService", "conditionOfProduct"
  ];

  for (const field of allowedFields) {
    if (Object.prototype.hasOwnProperty.call(productData, field)) {
      if (field === "title" || field === "description") {
        processedData[field] = typeof productData[field] === "string" ? productData[field].trim() : productData[field];
      } else {
        processedData[field] = productData[field];
      }
    }
  }

  // Handle file uploads
  if (imageUrl) {
    processedData.image = imageUrl;
  }
  if (documentUrl) {
    processedData.document = documentUrl;
  }

  // Handle old product specific fields
  if (
    productData.productType === "old_product" &&
    Object.prototype.hasOwnProperty.call(productData, "oldProductValue")
  ) {
    processedData.oldProductValue = {};
    if (parsedOldProductValue && typeof parsedOldProductValue === "object") {
      if (Object.prototype.hasOwnProperty.call(parsedOldProductValue, "min")) {
        processedData.oldProductValue.min = parsedOldProductValue.min;
      }
      if (Object.prototype.hasOwnProperty.call(parsedOldProductValue, "max")) {
        processedData.oldProductValue.max = parsedOldProductValue.max;
      }
    }
    if (Object.prototype.hasOwnProperty.call(productData, "productCondition")) {
      processedData.productCondition = productData.productCondition;
    }
  }

  // Handle payment and delivery
  if (Object.prototype.hasOwnProperty.call(productData, "paymentAndDelivery") && parsedPaymentAndDelivery) {
    processedData.paymentAndDelivery = {};
    if (Object.prototype.hasOwnProperty.call(parsedPaymentAndDelivery, "ex_deliveryDate")) {
      processedData.paymentAndDelivery.ex_deliveryDate = parsedPaymentAndDelivery.ex_deliveryDate;
    }
    if (Object.prototype.hasOwnProperty.call(parsedPaymentAndDelivery, "paymentMode")) {
      processedData.paymentAndDelivery.paymentMode = parsedPaymentAndDelivery.paymentMode;
    }
    if (productData.gst_requirement === "yes") {
      if (Object.prototype.hasOwnProperty.call(parsedPaymentAndDelivery, "gstNumber")) {
        processedData.paymentAndDelivery.gstNumber = parsedPaymentAndDelivery.gstNumber;
      }
      if (Object.prototype.hasOwnProperty.call(parsedPaymentAndDelivery, "organizationName")) {
        processedData.paymentAndDelivery.organizationName = parsedPaymentAndDelivery.organizationName;
      }
      if (Object.prototype.hasOwnProperty.call(parsedPaymentAndDelivery, "organizationAddress")) {
        processedData.paymentAndDelivery.organizationAddress = parsedPaymentAndDelivery.organizationAddress;
      }
    }
  }

  return processedData;
};

// Handle single product creation
const handleSingleProduct = async (req, res, { categoryId, subCategoryId, userId }) => {
  let { draft, ...productData } = req.body;
// console.log("productData",productData)
  // Process draft flag
  if (Array.isArray(draft)) {
    draft = draft[draft.length - 1];
  }
  if (typeof draft === "string") {
    draft = draft.toLowerCase() === "true";
  }

  // For non-draft products, validate required fields
  if (!draft) {
    if (!productData.title?.trim() || !productData.description?.trim()) {
      return ApiResponse.errorResponse(res, 400, "Title,  and description are required for non-draft products");
    }
  }

  // Debug: log files for troubleshooting image upload
  console.log("req.files:", req.files);

  // Get files
  const imageFile = req.files?.image?.[0];
  const documentFile = req.files?.document?.[0];
  const imageUrl = imageFile?.path || imageFile?.url || null;
  const documentUrl = documentFile?.path || documentFile?.url || null;

  // Process product data
  const processedData = processProductData(
    productData, 
    imageUrl, 
    documentUrl,
    categoryId, 
    subCategoryId, 
    userId, 
    draft
  );

  // ✅ Save product
  const newProduct = new productSchema(processedData);
  const savedProduct = await newProduct.save();

  return ApiResponse.successResponse(
    res,
    201,
    draft ? "Draft product created successfully" : "Product created successfully and added to subCategory",
    savedProduct
  );
};

// Handle multiple products creation
const handleMultipleProducts = async (req, res, { categoryId, subCategoryId, userId }) => {
  try {
    console.log("Starting multiple product processing...");
    const { products, draft, multiProductId } = req.body;
    
    console.log("Raw products data:", products);
    console.log("Draft:", draft);
    console.log("MultiProductId:", multiProductId);
    
    // Parse products if it's a string
    let parsedProducts = products;
    if (typeof products === "string") {
      try {
        parsedProducts = JSON.parse(products);
        console.log("Parsed products:", parsedProducts);
      } catch (error) {
        console.error("JSON parse error:", error);
        return ApiResponse.errorResponse(res, 400, "Invalid products format");
      }
    }
    
    if (!Array.isArray(parsedProducts)) {
      console.error("Products is not an array:", typeof parsedProducts);
      return ApiResponse.errorResponse(res, 400, "Products must be an array");
    }
    
    console.log(`Processing ${parsedProducts.length} products`);
    
    let multiProduct;
    let isNewMultiProduct = false;
    
    // Check if we're adding to an existing multi-product entry
    if (multiProductId && mongoose.Types.ObjectId.isValid(multiProductId)) {
      multiProduct = await multiProductSchema.findById(multiProductId);
      if (!multiProduct) {
        return ApiResponse.errorResponse(res, 404, "Multi-product entry not found");
      }
      
      // Verify ownership
      if (multiProduct.userId.toString() !== userId) {
        return ApiResponse.errorResponse(res, 403, "Not authorized to modify this multi-product entry");
      }
    } else {
      // Create new multi-product entry
      multiProduct = new multiProductSchema({
        userId: new mongoose.Types.ObjectId(userId),
        categoryId: new mongoose.Types.ObjectId(categoryId),
        subCategoryId: new mongoose.Types.ObjectId(subCategoryId),
        draft: draft === "true",
        subProducts: []
      });
      isNewMultiProduct = true;
    }
    
    // Process draft flag
    const isDraft = multiProduct.draft;
    console.log("Is draft:", isDraft);
    
    // Process each product
    const createdProducts = [];
    const imageFiles = req.files?.image || [];
    const documentFiles = req.files?.document || [];
    
    console.log(`Image files: ${imageFiles.length}, Document files: ${documentFiles.length}`);
    
    // Defensive: Check for excessive product count
    if (parsedProducts.length > 20) {
      console.error("Too many products in request:", parsedProducts.length);
      return ApiResponse.errorResponse(res, 400, "Too many products in request. Please limit to 20 at a time.");
    }
    if (imageFiles.length > parsedProducts.length || documentFiles.length > parsedProducts.length) {
      console.warn("File arrays longer than products array. imageFiles:", imageFiles.length, "documentFiles:", documentFiles.length, "products:", parsedProducts.length);
    }

    for (let i = 0; i < parsedProducts.length; i++) {
      const productData = parsedProducts[i];
      console.log(`Processing product ${i + 1}:`, productData.title);
      
      // For non-draft products, validate required fields
      if (!isDraft) {
        if (!productData.title?.trim() || !productData.quantity || !productData.description?.trim()) {
          // Clean up any already created products
          for (const product of createdProducts) {
            await productSchema.findByIdAndDelete(product._id);
          }
          if (isNewMultiProduct) {
            await multiProductSchema.findByIdAndDelete(multiProduct._id);
          }
          
          return ApiResponse.errorResponse(res, 400,
            `Product ${i+1}: Title, quantity, and description are required for non-draft products`);
        }
      }
      
      // Debug: log files for troubleshooting image upload
      console.log(`req.files for product ${i + 1}:`, {
        image: imageFiles[i],
        document: documentFiles[i]
      });

      // Get files for this product
      const imageFile = imageFiles[i] || null;
      const documentFile = documentFiles[i] || null;
      const imageUrl = imageFile?.path || imageFile?.url || null;
      const documentUrl = documentFile?.path || documentFile?.url || null;
      
      console.log(`Product ${i + 1} files - Image: ${imageUrl}, Document: ${documentUrl}`);
      
      // Process product data
      const processedData = processProductData(
        productData,
        imageUrl,
        documentUrl,
        categoryId,
        subCategoryId,
        userId,
        isDraft
      );
      
      console.log(`Processed data for product ${i + 1}:`, processedData);
      
      // Save product
      const newProduct = new productSchema(processedData);
      const savedProduct = await newProduct.save();
      console.log(`Saved product ${i + 1}:`, savedProduct._id);
      createdProducts.push(savedProduct);
      
      // Add to multi-product entry
      multiProduct.subProducts.push(savedProduct._id);
    }
    
    // Set main product ID if this is the first product in the multi-product entry
    if (isNewMultiProduct && createdProducts.length > 0) {
      multiProduct.mainProductId = createdProducts[0]._id;
    }
    
    // Save multi-product entry
    await multiProduct.save();
    console.log("Saved multi-product:", multiProduct._id);
    
    // Only add products to category if not a draft
    if (!isDraft) {
      for (const product of createdProducts) {
        const updatedCategory = await categorySchema.findOneAndUpdate(
          { _id: categoryId, "subCategories._id": subCategoryId },
          { $push: { "subCategories.$.products": product._id } },
          { new: true }
        );
        
        if (!updatedCategory) {
          console.error(`Category or SubCategory not found for product ${product._id}`);
        }
      }
    }
    
    return ApiResponse.successResponse(
      res,
      201,
      isDraft
        ? `Draft multi-product created successfully with ${createdProducts.length} products`
        : `Multi-product created successfully with ${createdProducts.length} products added to subCategory`,
      {
        multiProduct,
        products: createdProducts
      }
    );
  } catch (error) {
    console.error("Error in handleMultipleProducts:", error);
    return ApiResponse.errorResponse(res, 500, error.message || "Something went wrong while creating multiple products");
  }
};

// Main add product function
export const addProduct = async (req, res) => {
  const { categoryId, subCategoryId,isMultiple } = req.params;
  const userId = req.user?.userId;
  
  console.log(req.body,req.params,2234234)
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

    // Handle multiple products
    if (isMultiple == "true") {
      console.log('shadbaaz chgutitya')
      return await handleMultipleProducts(req, res, {
        categoryId,
        subCategoryId,
        userId
      });
    }
    
    // Handle single product
    return await handleSingleProduct(req, res, {
      categoryId,
      subCategoryId,
      userId
    });
  } catch (err) {
    console.error(err);
    return ApiResponse.errorResponse(
      res,
      400,
      err.message || "Something went wrong while creating product"
    );
  }
};

export const getMultiProduct = async (req, res) => {
  const { multiProductId } = req.params;
  const userId = req.user?.userId;
  
  try {
    if (!multiProductId || !mongoose.Types.ObjectId.isValid(multiProductId)) {
      return ApiResponse.errorResponse(res, 400, "Invalid or missing multiProductId");
    }
    
    const multiProduct = await MultiProduct.findById(multiProductId)
      .populate('mainProductId')
      .populate('subProducts')
      .populate('userId', 'name email')
      .populate('categoryId', 'name');
    
    if (!multiProduct) {
      return ApiResponse.errorResponse(res, 404, "Multi-product entry not found");
    }
    
    // Verify ownership
    if (multiProduct.userId._id.toString() !== userId) {
      return ApiResponse.errorResponse(res, 403, "Not authorized to access this multi-product entry");
    }
    
    return ApiResponse.successResponse(
      res,
      200,
      "Multi-product retrieved successfully",
      multiProduct
    );
  } catch (err) {
    console.error(err);
    return ApiResponse.errorResponse(
      res,
      400,
      err.message || "Something went wrong while retrieving multi-product"
    );
  }
};

// Update multi-product draft status
export const updateMultiProductDraftStatus = async (req, res) => {
  const { multiProductId } = req.params;
  const userId = req.user?.userId;
  const { draft } = req.body;
  
  try {
    if (!multiProductId || !mongoose.Types.ObjectId.isValid(multiProductId)) {
      return ApiResponse.errorResponse(res, 400, "Invalid or missing multiProductId");
    }
    
    const multiProduct = await MultiProduct.findById(multiProductId);
    
    if (!multiProduct) {
      return ApiResponse.errorResponse(res, 404, "Multi-product entry not found");
    }
    
    // Verify ownership
    if (multiProduct.userId.toString() !== userId) {
      return ApiResponse.errorResponse(res, 403, "Not authorized to modify this multi-product entry");
    }
    
    // Update draft status
    multiProduct.draft = draft === "true";
    await multiProduct.save();
    
    // If publishing (draft -> false), add all products to category
    if (!multiProduct.draft) {
      for (const productId of multiProduct.subProducts) {
        const updatedCategory = await Category.findOneAndUpdate(
          { _id: multiProduct.categoryId, "subCategories._id": multiProduct.subCategoryId },
          { $push: { "subCategories.$.products": productId } },
          { new: true }
        );
        
        if (!updatedCategory) {
          return ApiResponse.errorResponse(res, 404, "Category or SubCategory not found");
        }
      }
    }
    
    return ApiResponse.successResponse(
      res,
      200,
      `Multi-product ${multiProduct.draft ? 'saved as draft' : 'published successfully'}`,
      multiProduct
    );
  } catch (err) {
    console.error(err);
    return ApiResponse.errorResponse(
      res,
      400,
      err.message || "Something went wrong while updating multi-product"
    );
  }
};


export const getProducts = async (req, res) => {
    try {
        const { categoryId, subCategoryId } = req.params
        const { skip = 0, limit = 10 } = req.query; 
        const skipValue = parseInt(skip, 10);
        const limitValue = parseInt(limit, 10);

        let filter = {draft: false};

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

export const getDraftProducts = async (req, res) => {
  try {
      const userId = req.user._id;
      const { skip = 0, limit = 10 } = req.query;
      const skipValue = parseInt(skip, 10);
      const limitValue = parseInt(limit, 10);

      let filter = { draft: true, userId };

      const total = await productSchema.countDocuments(filter);
      const products = await productSchema.find(filter).skip(skipValue).limit(limitValue);

      return ApiResponse.successResponse(res, 200, "Draft products fetched successfully", { total, products });
  } catch (error) {
      return ApiResponse.errorResponse(res, 500, error.message);
  }
};

