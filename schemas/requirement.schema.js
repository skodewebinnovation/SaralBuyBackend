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
    ],
    dealStatus: {
      type: String,
      enum: ["pending", "completed"],
      default: "pending"
    },
  requirementApproved: { type: Boolean, default: false },
  isDelete: { type: Boolean, default: false }
  },
  { timestamps: true }
);

export default mongoose.model("Requirement", requirementSchema);