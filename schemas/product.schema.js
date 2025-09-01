import mongoose from "mongoose";

// const productSchema = new mongoose.Schema({
//     title: { type: String, required: true },
//     quantity: { type: Number, required: true },
//     categoryTypeId: { type: mongoose.Schema.Types.ObjectId,
//         ref: 'CategoryType'
//     },
//     minimumBudget: { type: Number },
//     productType: { type: String, enum: ["new_product", "old_product"], required: true },
//     oldProductValue:{ 
//       min:String,
//       max:String
//     },
//     productCondition:String, // if old one this
//  image: { type: String, default: null },    
//   document: { type: String, default: null }, 
//     description: { type: String, required: true },

//     categoryId:{
//         ref:'Category',
//         type: mongoose.Schema.Types.ObjectId
//     } , 
//     userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, 
    
//     paymentAndDelivery: {
//         ex_deliveryDate: { type: Date },
//         paymentMode: { type: String },
//         gstNumber: { type: String },
//         organizationName: { type: String },
//         organizationAddress: { type: String }
//     },

//     draft: { type: Boolean, default: false }
// }, { timestamps: true });


const productSchema = new mongoose.Schema({
  title: { type: String, required: true },
  quantity: { type: Number, required: true },
  minimumBudget: { type: Number, required: true },
  productType: { type: String, enum: ["new_product", "old_product"], required: true },
  description: { type: String },
  draft: { type: Boolean, default: false },
  categoryTypeId: { type: mongoose.Schema.Types.ObjectId, ref: "Category",required:true },
  subCategoryId: { type: mongoose.Schema.Types.ObjectId, ref: "SubCategory", required:true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User",required:true },
  image: { type: String, default: null },     // ✅ optional
  document: { type: String, default: null },  // ✅ optional
  oldProductValue: {
    min: Number,
    max: Number,
  },
  productCondition: String,
  paymentAndDelivery: {
    ex_deliveryDate: Date,
    paymentMode: String,
    gstNumber: { type: String, default: null },
    organizationName: { type: String, default: "" },
    organizationAddress: { type: String, default: "" },
  },
  createdAt: { type: Date, default: Date.now },
});

productSchema.index({ title: 1 });


export default mongoose.model("Product", productSchema);
