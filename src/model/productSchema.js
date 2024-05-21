const mongoose = require("mongoose");
const { Schema } = mongoose;

const productSchema = new Schema(
  {
    product_name: {
      type: String,
      required: true,
    },
    brand_name: {
      type: String,
      required: true,
    },
    category: {
      type: Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    images: {
      image1: {
        type: String,
        required: true
      },
      image2: {
        type: String,
        required: true
      },
      image3: {
        type: String,
        required: true
      },
      image4: {
        type: String,
        required: true
      }
    },
    price: {
      type: Number,
    },
    stock: {
      type: Number,
      required: true,
    },
    actualPrice: {
      type: Number,
      required: true,
    },
    sellingPrice: {
      type: Number,
      required: true,
    },
    onSale: {
      type: Boolean,
      default: true,
    },
    onOffer: {
      type: Boolean,
      default: false,
    },
    offerDiscountPrice: {
      type: Number,
      min: 0,
      default: 0
    },
    offerDiscountRate: {
      type: Number,
      min: 0,
      default: 0
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    reviews: [
      {
        user: {
          user_id: {
            type: Schema.Types.ObjectId,
            ref: "User",
          },
          name: {
            type: String,
          },
          email: {
            type: String,
          },
        },
        rating: {
          type: Number,
        },
        comment: {
          type: String,
        },
        date: {
          type: Date,
          default: Date.now,
        }
      }
    ]
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Product", productSchema);
