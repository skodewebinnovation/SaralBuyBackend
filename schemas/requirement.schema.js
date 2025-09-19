import mongoose from "mongoose";

const requirementSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    buyerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    sellers: [
      {
        sellerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        budgetAmount: { type: Number, required: true }
      }
    ]
  },
  { timestamps: true }
);

export default mongoose.model("Requirement", requirementSchema);