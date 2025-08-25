import mongoose from "mongoose";

const subCategorySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    }
}, { _id: true }); 
const categorySchema = new mongoose.Schema({
    image:String,
    categoryName:{
        type:String,
        required:true
    },
    subCategories:[
       subCategorySchema
    ]
})
export default mongoose.model("category",categorySchema)