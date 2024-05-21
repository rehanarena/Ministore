
const mongoose = require("mongoose");

const User = require("../model/userSchema");
const Returns = require("../model/returnSchema");
const Order = require("../model/orderSchema");
const Product = require("../model/productSchema");

const layout = "./layouts/adminLayout";

module.exports = {
  getReturnRequests: async (req, res) => {

    let perPage = 13;
    let page = req.query.page || 1;

    let returns = await Returns.find({})
      .populate("order_id user_id product_id")
      .sort({ createdAt: -1 })
      .skip(perPage * page - perPage)
      .limit(perPage)
    // find the variant from the product_id using variant
    // console.log(returns[0]);

    for (let request of returns) {
      const productId = request.product_id;

      const product = await Product.findById(productId); 
      if (!product) {
        console.log("Product not found");
        res.status(404).json({ success: false, message: "Product not found" });
      }

      if (request.status !== "pending") {
        request.return = true;
      } else {
        request.return = false;
      }
    }

    const count = await Returns.countDocuments();
    const nextPage = parseInt(page) + 1;
    const hasNextPage = nextPage <= Math.ceil(count / perPage);

    // console.log(returns[0].productDetail);

    res.render("admin/returns", {
      returns,
      current: page,
      pages: Math.ceil(count / perPage),
      nextPage: hasNextPage ? nextPage : null,
      layout,
    });
  },

  approveReturn: async (req, res) => {
    const { id, order_id,  item_id } = req.body;

    console.log(req.body);
    try {
      const returnRequest = await Returns.findByIdAndUpdate(
        new mongoose.Types.ObjectId(id),
        { status: "approved" },
        { new: true }
      );

      if (!returnRequest) {
        return res
          .status(404)
          .json({ success: false, message: "Return request not found" });
      }
      let update = { "items.$.status": "In-Return" };

      await Order.updateOne(
        {
          _id: order_id,
          "items.orderID": item_id,
          
        },
        { $set: update }
      );

      return res.status(200).json({
        success: true,
        message: "Return request approved",
      });
    } catch (error) {
      console.error(error);
      return res
        .status(500)
        .json({ success: false, message: "Failed to approve return request" });
    }
  },
  declineReturn: async (req, res) => {
    const { id } = req.params;

    try {
      const returnRequest = await Returns.findByIdAndUpdate(id, {
        status: "rejected",
      });

      if (!returnRequest) {
        return res
          .status(404)
          .json({ success: false, message: "Return request not found" });
      }

      return res.status(200).json({
        success: true,
        message: "Return request declined",
      });
    } catch (error) {
      console.error(error);
      return res
        .status(500)
        .json({ success: false, message: "Failed to decline return request" });
    }
  },
};