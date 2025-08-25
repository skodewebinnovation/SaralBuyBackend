import categorySchema from "../schemas/category.schema.js"
import {ApiResponse} from "../helper/ApiReponse.js"
const CreateCategories =async(req,res)=>{
    const {categoryName,subCategories}= req.body;
    if(!categoryName.length || !subCategories.length){
        return ApiResponse.errorResponse(res,400,'category name and subcategories are required')
    }
    try {
        const category = new categorySchema({
            image,
            categoryName,
            subCategories
        })
        await category.save()
       return ApiResponse.successResponse(res,200,'category created successfully',category)
        
    } catch (error) {
        console.log(error)
          return ApiResponse.errorResponse(res,400,error?.response||error,null)
    }
    
}
const GetCategories = async(req,res)=>{
    try {
        const categories = await categorySchema.find().lean();
        return ApiResponse.successResponse(res,200,'categories fetched successfully',categories)
    } catch (error) {
        return ApiResponse.errorResponse(res,400,error?.response||error,null)
        
    }

}
export{
    CreateCategories,
    GetCategories
}