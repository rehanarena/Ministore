const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const ObjectId = Schema.ObjectId;

const order_schema = new Schema(
  {
    customer_id: {
      type: ObjectId,
      ref: "User",
      require: true,
    },
    items: [
      {
        product_id: {
          type: ObjectId,
          ref: "Product",
          required: true,
        },
        quantity: {
          type: Number,
          required: true,
        },
        price: {
          type: Number,
        },
        itemTotal: {
          type: Number,
        },

        status: {
          type: String,
        },
        paymentStatus: {
          type: String,
        },
        shipped_on: {
          type: Date,
        },
        out_for_delivery: {
          type: Date,
        },
        delivered_on: {
          type: Date,
        },
        cancelled_on: {
          type: Date,
        },
        returnReason: {
          type: String,
        },
        returned_on: {
          type: Date,
        },
      },
    ],
    address: {
      house_name: {
        type: String,
        required: true,
      },
      area_street: {
        type: String,
        required: true,
      },
      town: {
        type: String,
        required: true,
      },
      state: {
        type: String,
        required: true,
      },
      zipcode: {
        type: Number,
        required: true,
      },
      locality: {
        type: String,
        required: true,
      },
      landmark: {
        type: String,
        required: true,
      },
    },

    paymentMethod: {
      type: String,
      required: true,
    },
    totalPrice: {
      type: Number,
      required: true,
      min: 0,
    },

    coupon: {
      type: ObjectId,
      ref: "Coupon",
    },
    couponDiscount: {
      type: Number,
      default: 0,
    },
    payable: {
      type: Number,
    },
    categoryDiscount: {
      type: Number,
      default: 0,
    },
    paymentStatus: {
      type: String,
      enum: ["paid", "pending", "cod", "failed", "refunded", "cancelled"],
      // required: true,
    },
    status: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Order", order_schema);
