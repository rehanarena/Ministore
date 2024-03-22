const mongoose = require("mongoose");
const Product = require("../model/productSchema");
const Order = require("../model/orderSchema");
const Cart = require("../model/cartSchema");
const User = require("../model/userSchema");

module.exports = {
  getCart: async (req, res) => {
    const userCart = await Cart.findOne({ user_id: req.user.id }).populate(
      "items.product_id"
    );
    console.log(userCart.items);
    res.render("shop/cart", {
      userCart,
    });
  },
  addToCart: async (req, res) => {
    const product_id = req.params.id;
    try {
      const product = await Product.findOne({
        _id: product_id,
        isActive: true,
      });
      if (!product) {
        return res
          .status(404)
          .json({ success: false, message: "Product not Found" });
      }
      const userCart = await Cart.findOne({ user_id: req.user.id });
      if (!userCart) {
        const newCart = new Cart({
          user_id: req.user.id,
          items: [
            {
              product_id,
              quantity: 1,
              itemTotal: product.sellingPrice,
            },
          ],
          totalPrice: product.sellingPrice,
        });

        await newCart.save();
        return res
          .status(200)
          .json({ success: true, message: "sucessfully added to cart" });
      } else {
        const itemExists = userCart.items.find(
          (item) => item.product_id.toString() === product_id
        );
        if (itemExists) {
          return res
            .status(400)
            .json({ success: false, message: "Already Added to cart" });
        }
        userCart.items.push({
          product_id,
          quantity: 1,
          itemTotal: product.sellingPrice,
        });
        let totalPrice = 0;
        for (item of userCart.items) {
          totalPrice += item.itemTotal;
        }
        userCart.totalPrice = totalPrice;
        await userCart.save();
        return res
          .status(200)
          .json({ success: true, message: "sucessfully added to cart" });
      }
    } catch (error) {
      console.log(error);
      return res
        .status(500)
        .json({ success: false, message: "Internal serever error" });
    }
  },
  updateQuantity: async (req, res) => {
    try {
      const productId = req.params.id;
      const qty = parseInt(req.query.qty);

      const userCart = await Cart.findOne({ user_id: req.user.id });

      if (!userCart) {
        return res
          .status(400)
          .json({ success: false, message: "Cart not found" });
      }

      const productExist = await Product.findById(productId);

      if (!productExist) {
        return res
          .status(400)
          .json({ success: false, message: "Product not found" });
      }

      const cartItem = userCart.items.find(
        (item) => item.product_id.toString() === productId
      );

      if (!cartItem) {
        return res
          .status(400)
          .json({ success: false, message: "Product not in cart" });
      }

      let currentQuantity = cartItem.quantity;
      console.log(currentQuantity);
      if (qty >0) {
        currentQuantity += qty;

        if (currentQuantity > productExist.stock) {
          return res
            .status(400)
            .json({ success: false, message: "Insufficient Stock" });
        }
      } else if (qty ===-1) {
        currentQuantity += qty;

        if (currentQuantity <= 0) {
          return res.status(400).json({
            success: false,
            message: "Cannot Decrease quantity to Zero",
          });
        }
      }

      const updateCart = await Cart.updateOne(
        {
          user_id: req.user.id,
          "items.product_id": productId,
        },
        {
          $set: {
            "items.$.quantity": currentQuantity,
          },
        },
        {
          new: true,
        }
      );

      // console.log(updateCart);

      if (updateCart) {
        const updatedCart = await Cart.findOne({
          user_id: req.user.id,
        }).populate("items.product_id");

        // itemTotal recalculate
        // cart totalPrice recalculate
        let totalPrice = 0;
        for (prod of updatedCart.items) {
          prod.itemTotal = prod.product_id.sellingPrice * prod.quantity;
          totalPrice += prod.itemTotal;
        }

        updatedCart.totalPrice = totalPrice;

        const updatedItem = updatedCart.items.find(
          (item) => item.product_id._id.toString() === productId
        );

        console.log(updatedItem);

        await updatedCart.save();

        return res
          .status(200)
          .json({ success: true, currentItem: updatedItem, totalPrice });
      }
    } catch (error) {
      console.log(error);
      res.status(500).json({
        success: false,
        message: error.message || "Internal Server Error",
      });
    }
  },
  removeCartItem: async (req, res) => {
    try {
      console.log(req.params);
      const productId =(req.params.id)
      const userId = req.user.id;

      console.log(
        `Removing product with ID: ${productId} from user with ID: ${userId}`
      );

      const result = await Cart.updateOne(
        { user_id: req.user.id },
        { $pull: { items: { product_id: new mongoose.Types.ObjectId(productId) } } }
      );

      if (result.modifiedCount === 0) {
        console.log(
          "No items were removed. Product ID might not exist in the cart."
        );
        return res
          .status(404)
          .json({ success: false, message: "Item not found in cart" });
      }

      res.json({ success: true, message: "Item removed from cart" });
    } catch (error) {
      console.error("Error removing item", error);
      res
        .status(500)
        .json({ success: false, message: "Error removing item from cart" });
    }
  },

  


};
