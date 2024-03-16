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
          .json({ sucess: true, message: "sucessfully added to cart" });
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
      }
    } catch (error) {
      console.log(error);
      return res
        .status(500)
        .json({ success: false, message: "Internal serever error" });
    }
  },
  updateQuantity: async (req, res) => {
    const product_id = req.params.id;
    const quantity = req.query.quantity;

    try {
      // Find the cart by its ID
      let cart = await Cart.findOne({user_id: req.user.id});

      if (!cart) {
        // Cart does not exist
        return res.status(404).send("Cart not found");
      }

      // Find the product in the cart
      let itemIndex = cart.items.findIndex(
        (p) => p.product_id.toString() === product_id
      ); // Corrected field name

      if (itemIndex === -1) {
        // Product does not exist in the cart
        return res.status(404).send("Product not found in the cart");
      }

      // Assuming you have a Product model with a method to get stock
      const product = await Product.findById(product_id);
      if (!product) {
        return res.status(404).send("Product not found");
      }

      // Compare the requested quantity with the available stock
      if (quantity > product.stock) {
        return res
          .status(400)
          .send("Requested quantity exceeds available stock");
      }

      // Update the quantity of the product in the cart
      let productItem = cart.items[itemIndex];
      productItem.quantity += parseInt(quantity); // Corrected to use `quantity`
      cart.items[itemIndex] = productItem;

      // Save the updated cart
      cart = await cart.save();

      return res.status(200).send(cart);
    } catch (err) {
      console.log(err);
      res.status(500).send("Something went wrong");
    }
  },
};
