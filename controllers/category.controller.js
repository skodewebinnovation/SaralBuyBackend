import categorySchema from "../schemas/category.schema.js"
import { ApiResponse } from "../helper/ApiReponse.js"
import mongoose from "mongoose";

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const CreateCategories = async (req, res) => {
    let { categoryName, subCategories, title, description } = req.body || {};

    if (typeof subCategories === "string") {
        try {
            subCategories = JSON.parse(subCategories);
        } catch (err) {
            return ApiResponse.errorResponse(res, 400, "Invalid subCategories format, must be JSON array");
        }
    }

    // Validation
    if (!categoryName?.length || !Array.isArray(subCategories) || !subCategories.length) {
        return ApiResponse.errorResponse(res, 400, 'Category name and subcategories are required');
    }

    try {
        // Store only Cloudinary URL
        const image = req.file?.path || null;

        const category = new categorySchema({
            categoryName,
            subCategories,
            title,
            description,
            image
        });

        await category.save();

        return ApiResponse.successResponse(res, 200, 'Category created successfully', category);
    } catch (error) {
        console.error(error);
        return ApiResponse.errorResponse(res, 500, error?.message || 'Server error');
    }
};
const GetCategories = async(req,res)=>{
    try {
        const categories = await categorySchema.find().lean();
        return ApiResponse.successResponse(res,200,'categories fetched successfully',categories)
    } catch (error) {
        return ApiResponse.errorResponse(res,400,error?.response||error,null)
        
    }

}

// Update Category
const UpdateCategory = async (req, res) => {
    const { categoryId } = req.params;
    let { categoryName, subCategories, title, description } = req.body || {};

    if (!isValidObjectId(categoryId)) {
        return ApiResponse.errorResponse(res, 400, "Invalid category ID");
    }

    if (typeof subCategories === "string") {
        try {
            subCategories = JSON.parse(subCategories);
        } catch (err) {
            return ApiResponse.errorResponse(res, 400, "Invalid subCategories format, must be JSON array");
        }
    }

    try {
        const category = await categorySchema.findById(categoryId);
        if (!category) return ApiResponse.errorResponse(res, 404, "Category not found");

        // Update fields if provided
        if (categoryName) category.categoryName = categoryName;
        if (title) category.title = title;
        if (description) category.description = description;
        if (Array.isArray(subCategories) && subCategories.length) category.subCategories = subCategories;

        // Update image if uploaded
        if (req.file?.path) category.image = req.file.path;

        await category.save();
        return ApiResponse.successResponse(res, 200, "Category updated successfully", category);
    } catch (error) {
        console.error(error);
        return ApiResponse.errorResponse(res, 500, error?.message || "Server error");
    }
};

export{
    CreateCategories,
    GetCategories,
    UpdateCategory
}