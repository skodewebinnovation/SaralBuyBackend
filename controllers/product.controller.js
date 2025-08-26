import mongoose from "mongoose";
import categorySchema from "../schemas/category.schema.js";
import productSchema from "../schemas/product.schema.js";
import {ApiResponse} from "../helper/ApiReponse.js"

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

export const addProduct = async (req, res) => {
    try {
        const { categoryId, subCategoryId } = req.params;
        const {
            title,
            quantity,
            minimumBudget,
            productType,
            description,
            paymentAndDelivery,
            draft
        } = req.body;

        // Validate IDs
        if (!isValidObjectId(categoryId) || !isValidObjectId(subCategoryId)) {
            return ApiResponse.errorResponse(res, 400, "Invalid category or subcategory ID");
        }

        // Validate required product fields
        if (!title?.trim() || !quantity || !minimumBudget) {
            return ApiResponse.errorResponse(res, 400, "Title, quantity, and minimum budget are required");
        }

        // Find category and subcategory
        const category = await categorySchema.findById(categoryId);
        if (!category) return ApiResponse.errorResponse(res, 404, "Category not found");

        const subCategory = category.subCategories.id(subCategoryId);
        if (!subCategory) return ApiResponse.errorResponse(res, 404, "Subcategory not found");

        // Create product
        const product = await productSchema.create({
            title,
            quantity,
            minimumBudget,
            productType,
            image: req.file?.path, // uploaded image via middleware
            document: req.body.document || null, // optional, can later handle document upload similarly
            description,
            paymentAndDelivery,
            draft: draft || false
        });

        // Add product reference to subcategory
        subCategory.products.push(product._id);
        await category.save();

        return ApiResponse.successResponse(res, 201, "Product added successfully", product);
    } catch (error) {
        console.error(error);
        return ApiResponse.errorResponse(res, 500, error?.message || "Server error");
    }
};

export const getProducts = async (req, res) => {
    try {
        const { categoryId, subCategoryId } = req.query;
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

        const products = await Product.find(filter);
        return ApiResponse.successResponse(res, 200, "Products fetched successfully", products);
    } catch (error) {
        return ApiResponse.errorResponse(res, 500, error.message);
    }
};

export const updateProduct = async (req, res) => {
    try {
        const { productId } = req.params;
        if (!isValidObjectId(productId)) return ApiResponse.errorResponse(res, 400, "Invalid product ID");

        const updatedProduct = await productSchema.findByIdAndUpdate(productId, req.body, { new: true });
        if (!updatedProduct) return ApiResponse.errorResponse(res, 404, "Product not found");

        return ApiResponse.successResponse(res, 200, "Product updated successfully", updatedProduct);
    } catch (error) {
        return ApiResponse.errorResponse(res, 500, error.message);
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
