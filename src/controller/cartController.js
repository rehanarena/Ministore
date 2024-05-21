const mongoose = require("mongoose");
const Product = require("../model/productSchema");
const Order = require("../model/orderSchema");
const Cart = require("../model/cartSchema");
const User = require("../model/userSchema");

module.exports = {
  getCart: async (req, res) => {
    let errors = [];
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Please log in to view cart." });
    }
    try {
    let userCart = await Cart.findOne({ user_id: req.user.id }).populate(
      "items.product_id"
    );
    console.log(userCart);

    if (!userCart) {
      userCart = {
        items: [],
        totalPrice: 0,
      };
    } else {
      let totalPrice = 0;
      for (const prod of userCart.items) {
        prod.price = prod.product_id.onOffer
          ? prod.product_id.offerDiscountPrice
          : prod.product_id.sellingPrice;

        const itemTotal = prod.price * prod.quantity;
        prod.itemTotal = itemTotal;
        totalPrice += itemTotal;
      }

      userCart.totalPrice = totalPrice;
      userCart.payable = totalPrice;

      for (const item of userCart.items) {
        const product = await Product.findOne({
          _id: item.product_id,
        });

        if (!product) {
          console.log(`The Product ${item.product_id} is not found!!`);
          errors.push(`The Product ${item.product_id} is not found!!`);
          continue;
        }

        if (!product.isBlocked) {
          console.log(
            `The Product ${product.product_name} is not available!!`
          );
          errors.push(
            `The Product ${product.product_name} is not available!!`
          );
          continue;
        }
        //check stock
      }
      await userCart.save();
    }

    res.render("shop/cart", {
      userCart,
      errorMsg: errors,
    });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ error: "An error occurred while fetching the cart." });
  }
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
  
      const stock = product.stock;
      if (stock === 0) {
        return res
          .status(409)
          .json({ status: false, message: "Product Out Of Stock" });
      }
  
      const userCart = await Cart.findOne({ user_id: req.user.id });
      if (!userCart) {
        const newCart = new Cart({
          user_id: req.user.id,
          items: [
            {
              product_id,
              quantity: 1,
              price: product.sellingPrice,
              itemTotal: product.sellingPrice,
            },
          ],
          totalPrice: product.sellingPrice,
        });
  
        await newCart.save();
        return res
          .status(200)
          .json({ success: true, message: "Successfully added to cart" });
      } else {
        const existingItemIndex = userCart.items.findIndex(
          (item) => item.product_id.toString() === product_id
        );
  
        if (existingItemIndex !== -1) {
          // If item already exists, increase its quantity
          userCart.items[existingItemIndex].quantity += 1;
          userCart.items[existingItemIndex].itemTotal += product.sellingPrice;
        } else {
          userCart.items.push({
            product_id,
            quantity: 1,
            price: product.sellingPrice,
            itemTotal: product.sellingPrice,
          });
        }
        
        let totalPrice = 0;
        for (item of userCart.items) {
          totalPrice += item.itemTotal;
        }
        userCart.totalPrice = totalPrice;
        await userCart.save();
        return res
          .status(200)
          .json({ success: true, message: "Successfully added to cart" });
      }
    } catch (error) {
      console.log(error);
      return res
        .status(500)
        .json({ success: false, message: "Internal server error" });
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
      const productId = req.params.id;
      const userId = req.user.id;
  
      console.log(
        `Removing product with ID: ${productId} from user with ID: ${userId}`
      );
  
      // Remove the item from the cart
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
  
      // Retrieve the updated cart data
      const updatedCart = await Cart.findOne({ user_id: req.user.id });
  
      // If the cart is empty, delete the cart document
      if (!updatedCart.items || updatedCart.items.length === 0) {
        await Cart.deleteOne({ user_id: req.user.id });
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
