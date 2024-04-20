const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const ObjectId = Schema.ObjectId;

const order_schema = new Schema(
  {
    customer_id: {
      type: ObjectId,
      ref: 'User',
      require: true,
    },
    items: [
      {
        product_id: {
          type: ObjectId,
          ref: 'Product',
          required: true,
        },
        quantity: {
          type: Number,
          required: true,
        },
        price: {
          type: Number,
          required: true,
        },
       
       
        status: {
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
      },
    ],
    address: {
      house_name: {
          type: String,
          required: true
      },
      area_street: {
          type: String,
          required: true
      },
      town: {
          type: String,
          required: true
      },
      state: {
          type: String,
          required: true
      },
      zipcode: {
          type: Number,
          required: true
      },
      locality: {
          type: String,
          required: true
      },
      landmark: {
          type: String,
          required: true
      }
  },
    payment_method: {
      type: String,
      required: true,
    },
    total_amount: {
      type: Number,
      required: true,
    },
    
    status: {
      type: String,
      required: true,
    },
    payable: {
      type: Number,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Order", order_schema);