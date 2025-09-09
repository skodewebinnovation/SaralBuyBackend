import mongoose from "mongoose";

const productSchema = new mongoose.Schema({
  title: {
    type: String,
    required: function() { return this.draft === false; }
  },
  quantity: {
    type: Number,
    required: function() { return this.draft === false; }
  },
  minimumBudget: { type: Number },
  productType: { type: String,}, // ["new_product", "old_product"]
  description: { type: String },
  draft: { type: Boolean, default: false },
  categoryId: { type: mongoose.Schema.Types.ObjectId, ref: "Category" },
  subCategoryId: { type: mongoose.Schema.Types.ObjectId}, // this is subcategoryId from category schema
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  image: { type: String, default: null },    
  document: { type: String, default: null }, 

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
  // constructionToolType: { type: String },
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
},{
  timestamps:true
});

productSchema.index({ title: 1 });

export default mongoose.model("Product", productSchema);
