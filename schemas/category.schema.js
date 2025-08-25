import mongoose from "mongoose";

const categorySchema = new mongoose.Schema({
    categoryName:{
        type:String,
        required:true
    },
    subCategories:[
       {
        type:String
       } 
    ]
})
export default mongoose.model("category",categorySchema)