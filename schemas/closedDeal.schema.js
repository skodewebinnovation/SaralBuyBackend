import mongoose from "mongoose";

const closedDealSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    buyerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    sellerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    budgetAmount: { type: Number, required: true },
    closedAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

export default mongoose.model("ClosedDeal", closedDealSchema);