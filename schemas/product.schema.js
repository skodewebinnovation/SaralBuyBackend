import mongoose from "mongoose";

const productSchema = new mongoose.Schema({
    title: { type: String, required: true },
    quantity: { type: Number, required: true },
    minimumBudget: { type: Number },
    productType: { type: String },
    image: { type: String },      // store image URL or path
    document: { type: String },   // store doc/pdf path
    description: { type: String, required: true },
    paymentAndDelivery: {
        ex_deliveryDate: { type: Date },
        paymentMode: { type: String },
        gstNumber: { type: String },
        organizationName: { type: String },
        organizationAddress: { type: String }
    },
    draft: { type: Boolean, default: false }
}, { timestamps: true });
productSchema.index({title:1})

productSchema.index({ title: "text", description: "text" });

export default mongoose.model("Product", productSchema);
