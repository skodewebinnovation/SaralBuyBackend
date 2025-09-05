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
  productType: { type: String,}, // ["new_product", "old_product"]
  description: { type: String },
  draft: { type: Boolean, default: false },
  categoryId: { type: mongoose.Schema.Types.ObjectId, ref: "Category" },
  subCategoryId: { type: mongoose.Schema.Types.ObjectId}, // this is subcategoryId from category schema
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  image: { type: String, default: null },     // ✅ optional
  document: { type: String, default: null },  // ✅ optional

  // ✅ New fields added
  color: { type: String },
  selectCategory: { type: String }, 
  brand: { type: String },
  additionalDeliveryAndPackage: { type: String },
  fuelType: { type: String},
  model: { type: String },
  transmission: { type: String},
  productCategory: { type: String },  // To avoid conflict with productType (already exists)
  gender: { type: String},
  typeOfAccessories: { type: String },
  constructionToolType: { type: String },
  toolType: { type: String },
  rateAService: { type: Number}, 
  conditionOfProduct:String, // this is for only furniture 

  oldProductValue: {
    min: Number,
    max: Number,
  },

  productCondition: String,

  paymentAndDelivery: {
    ex_deliveryDate: Date,
    paymentMode: String,
    gstNumber: { type: String, default: "" },
    organizationName: { type: String, default: "" },
    organizationAddress: { type: String, default: "" },
  },
});

productSchema.index({ title: 1 });

export default mongoose.model("Product", productSchema);
