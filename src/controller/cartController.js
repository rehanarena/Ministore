const mongoose = require("mongoose");
const Product = require("../model/productSchema");
const Order = require("../model/orderSchema");
// const Cart = require("../model/cartSchema");
const User = require("../model/userSchema");

const addProductToCart = async (userId, productId) => {
    const addProductToCart = async (userId, productId) => {
        const user = await User.findOne({ _id: userId });
       
        // Assuming you have a Product model and a pipeline to get the stock
        const product = await Product.findById(productId);
        const stock = product.stock; // Assuming stock is directly on the product
       
        const currentQuantity = user.cart.find(
           (item) => item.product_id.toString() === productId
        );
       
        if (currentQuantity) {
           // Product exists in the cart, increment quantity
           let quantity = currentQuantity.quantity;
       
           if (quantity >= stock) {
             // Quantity exceeds stock, return false
             return false;
           } else {
             // Increment quantity and update the cart
             const updated = await User.findOneAndUpdate(
               {
                 _id: userId,
                 "cart.product_id": productId,
               },
               {
                 $inc: {
                   "cart.$.quantity": 1,
                 },
               }
             );
             return updated;
           }
        } else {
           const cart = {
             $push: {
               cart: {
                 product_id: productId,
                 quantity: 1,
               },
             },
           };
           const updatedCart = await User.findByIdAndUpdate({ _id: userId }, cart, {
             new: true,
           });
           return updatedCart;
        }
       };
       const handleCartUpdate = async (req, res, increment = true) => {
        try {
           const userID = req.user.id;
           const { id: productId } = req.params; // Removed variantId
           let user = await User.findOne({ _id: userID });
       
           // Assuming you have a Product model and a pipeline to get the stock
           const product = await Product.findById(productId);
           const stock = product.stock; // Assuming stock is directly on the product
       
           const currentQuantity = user.cart.find(
             (item) => item.product_id.toString() === productId
           );
       
           if (increment && currentQuantity && currentQuantity.quantity >= stock) {
             return res.status(400).json({
               success: false,
               message: "Quantity Exceeds Product Stock",
             });
           } else if (!increment && currentQuantity && currentQuantity.quantity <= 1) {
             return res.status(400).json({
               success: false,
               message: "Cannot decrease quantity below 1",
             });
           }
       
           const updated = await User.updateOne(
             {
               _id: userID,
               "cart.product_id": productId,
             },
             {
               $inc: {
                 "cart.$.quantity": increment ? 1 : -1,
               },
             },
             { new: true }
           );
       
           if (updated) {
             let userCart = await User.findById(userID).populate("cart.product_id");
             let totalPrice = 0;
             for (let prod of userCart.cart) {
               prod.price = prod.product_id.sellingPrice * prod.quantity;
               totalPrice += prod.price;
             }
             const currentItem = userCart.cart.find(
               (item) => item.product_id._id.toString() === productId
             );
       
             console.log(totalPrice);
             return res.status(200).json({
               success: true,
               cart: currentItem,
               totalPrice,
             });
           } else {
             return res.status(400).json({
               success: false,
               message: "Failed to update cart item",
             });
           }
        } catch (error) {
           console.log(error);
           return res.status(500).json({
             success: false,
             message: "Server error",
             error: error.message,
           });
        }
       };
              
   
       module.exports = {
        getCart: async (req, res) => {
           let errors = [];
           if (!req.isAuthenticated()) {
             req.flash("error", "Please log in to view cart.");
             return res.redirect("/login");
           } else {
             let user = await User.findById(req.user.id);
       
             let userCart = await User.findById(req.user.id).populate("cart.product_id");
       
             let cartList = await User.aggregate([
               { $match: { _id: user._id } },
               { $project: { cart: 1, _id: 0 } },
               { $unwind: "$cart" },
               {
                 $lookup: {
                   from: "products",
                   localField: "cart.product_id",
                   foreignField: "_id",
                   as: "prod_details",
                 },
               },
               { $unwind: "$prod_details" },
             ]);
       
             let totalPrice = 0;
             for (let prod of cartList) {
               prod.price = prod.prod_details.sellingPrice * prod.cart.quantity;
               totalPrice += prod.price; // Calculate total price
             }
       
             for (const item of user.cart) {
               try {
                 const product = await Product.findOne({
                   _id: item.product_id,
                 });
                 if (product) {
                   let notFound = false;
                   if (!product.isActive) {
                     notFound = true;
                     errors.push(
                       `The Product ${product.product_name} is not available!!`
                     );
                   }
                   if (notFound) {
                     errors.push(
                       `The Product ${product.product_name} is not found!!`
                     );
                   }
                 } else {
                   errors.push(`The Product ${product.product_name} is not found!!`);
                 }
               } catch (error) {
                 console.error(`Error finding stock for item: ${error.message}`);
               }
             }
       
             let cartCount = req.user.cart.length; // Update cartCount
       
             res.render("shop/cart", {
               cartList: userCart.cart,
               cartCount,
               totalPrice,
               errorMsg: errors,
             });
           }
        },
        addToCart: async (req, res) => {
          if (!req.isAuthenticated()) {
            return res.status(401).json({
              status: false,
              message: "You need to login to add items to the cart!",
            });
          }
      
          let userId = req.user.id;
          let { productId } = req.body;
      
          try {
            const product = await Product.findById(productId);
            if (!product) {
              return res
                .status(404)
                .json({ status: false, message: "Product not found" });
            }
      
            const stock = product.stock;
            if (stock === 0) {
              return res
                .status(409)
                .json({ status: false, message: "Product Out Of Stock" });
            }
      
            let updatedUser = await addProductToCart(userId, productId);
            if (updatedUser) {
              let cartCount = updatedUser.cart.length;
              return res.json({
                status: true,
                count: cartCount,
              });
            } else {
              return res
                .status(400)
                .json({ status: false, message: "Quantity Exceeds Product Stock" });
            }
          } catch (error) {
            console.error("Error adding product to cart:", error);
            return res.status(500).json({ error: "Internal server error" });
          }
       },
       removeCartItem: async (req, res) => {
          let id = req.params.id;
          let userId = req.user.id;
          await User.updateOne(
            { _id: userId },
            { $pull: { cart: { product_id: id } } }
          );
          res.json({
            status: true,
          });
       },
        // Use the helper function in both incrementCartItem and decrementCartItem
  incrementCartItem: async (req, res) => {
    await handleCartUpdate(req, res, true);
  },

  decrementCartItem: async (req, res) => {
    await handleCartUpdate(req, res, false);
  },

  getOrderSuccess: async (req, res) => {
    let user = await User.findById(req.user.id);
    let order = await Order.aggregate([
      {
        $match: {
          customer_id: user._id,
        },
      },
      {
        $sort: {
          createdAt: -1,
        },
      },
      {
        $limit: 1,
      },
    ]);
    let order_id = order[0]._id;

    res.render("shop/orderConfirm", {
      order: order_id,
    });
  },
}
}