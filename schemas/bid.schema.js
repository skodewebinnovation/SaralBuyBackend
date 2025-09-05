import mongoose from "mongoose";

const bidSchema = new mongoose.Schema(
  {
    sellerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    buyerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    budget: { type: Number, required: true },
    status: { type: String, enum: ["active", "inactive"], default: "active" },
    availableBrand: { type: String },
    earliestDeliveryBy: { type: String }
  },
  { timestamps: true }
);

export default mongoose.model("Bid", bidSchema);