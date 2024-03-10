const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
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
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },
    description: {
      type: String,
      required: true,
    
    },
    images:{
      image1:{
        type:String,
        required:true
      },
      image2:{
        type:String,
        required:true
      },
      image3:{
        type:String,
        required:true
      },
      image4:{
        type:String,
        required:true
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
    isActive: {
      type: Boolean,
      default: true,
    }
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Product", productSchema);