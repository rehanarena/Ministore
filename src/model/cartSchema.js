const mongoose = require("mongoose");
const cartSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    items: [
      {
        product_id: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
          require: true,
        },
        quantity: {
          type: Number,
          required: true,
          min: 1,
        },
        itemTotal: {
          type: Number,
          min: 0,
        },
      },
    ],
    totalPrice: {
      type: Number,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);
module.exports = mongoose.model("Cart", cartSchema);
