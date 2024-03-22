const mongoose = require("mongoose");
const Product = require("../model/productSchema");
const Cart = require("../model/cartSchema");
const User = require("../model/userSchema");
const Address = require("../model/addressSchema");
const Order = require("../model/orderSchema");

module.exports = {
  getCheckout: async (req, res) => {
    const userCart = await Cart.findOne({ user_id: req.user.id }).populate(
      "items.product_id"
    );
    const productId = req.params.productId;
    const address = await Address.find({
      customer_id: req.user.id,
    });


    let totalPrice = 0;
    // Correctly declare the variable before the loop
    for (let prod of userCart.items) {
      prod.itemTotal += prod.product_id.sellingPrice * prod.quantity;
      totalPrice += prod.itemTotal;
    }

    const locals = {
      title: "Ministore - Checkout",
    };

    res.render("shop/checkout", {
      locals,
      userCart,
      address,
      totalPrice,
    });
  },

  addAddress: async (req, res) => {
    console.log(req.body);
    await Address.create(req.body);
    req.flash("success", "Address Addedd");
    res.redirect("/user/checkout");
  },
  editAddress: async (req, res) => {
    try {
      const addressId = req.params.id;
      const updatedAddress = req.body;

      // Assuming you have a model for addresses, e.g., Address
      const address = await Address.findByIdAndUpdate(
        addressId,
        updatedAddress,
        {
          new: true, // returns the new document if true
        }
      );

      if (!address) {
        return res.status(404).send({ message: "Address not found" });
      }

      req.flash("success", "Address Edited");
      res.redirect("/user/checkout");
    } catch (error) {
      console.error(error);
      req.flash("error", "Error editing address. Please try again.");
      res.redirect("/user/checkout");
    }
  },
  deleteAddress: async (req, res) => {
    console.log(req.params);
    let id = req.params.id;
    try {
      const result = await Address.deleteOne({ _id: id });
      if (result.deletedCount === 1) {
        // If the document was successfully deleted, send a success response
        res.status(200).json({ message: "Address deleted successfully" });
      } else {
        // If no document was found to delete, send an appropriate response
        res.status(404).json({ message: "Address not found" });
      }
    } catch (error) {
      // Handle any errors that occurred during the database operation
      console.error(error);
      res.status(500).json({ message: "Internal server error" });
    }
  },
  placeOrder : async (req, res) => {
  try {
      if (!req.body.address) {
          return res.json({ success: false, message: "Please add the address" });
      }

      const user = await User.findById(req.user.id);
      let status;
      if (req.body.paymentMethod === "COD" || req.body.paymentMethod === "wallet") {
          status = "confirmed";
      } else {
          status = "pending";
      }

      const userCart = await Cart.findOne({ user_id: req.user.id }).populate("items.product_id");

      const address = await Address.findById(req.body.address);

      if (address && userCart) {
          let items = [];

          for (let item of userCart.items) {
              items.push({
                  product_id: item.product_id._id,
                  quantity: item.quantity,
                  price: parseInt(item.product_id.sellingPrice),
              });
          }

          let totalPrice = 0;
          for (let item of items) {
              item.price = item.price * item.quantity;
              totalPrice += item.price;
          }

          let order = {
              customer_id: user._id,
              items: items,
              address: address,
              payment_method: req.body.paymentMethod,
              total_amount: totalPrice,
              status: status,
          };

          if (req.body.paymentMethod === "COD") {
              const createOrder = await Order.create(order);
              if (createOrder) {
                  // Empty the cart
                  await Cart.updateOne({ user_id: user._id }, { $unset: { items: "" } });

                  // Reduce the stock count
                  for (let item of items) {
                      await Product.updateOne({ _id: item.product_id }, { $inc: { stock: -item.quantity } });
                  }
                  req.session.order = { status: true };
                  return res.json({ success: true });
              }
          } else {
              return res.json({ success: false, message: "Invalid payment method" });
          }
      } else {
          return res.json({ success: false, message: "Address or cart not found" });
      }
  } catch (error) {
      console.error("Error placing order:", error);
      return res.status(500).json({ success: false, message: "Error placing order" });
  }
},


};
