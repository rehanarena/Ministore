const mongoose = require("mongoose");
const Order = require("../model/orderSchema");
const User = require("../model/userSchema");
const Product = require("../model/productSchema");
const Address = require("../model/addressSchema");
const Cart = require("../model/cartSchema");
const Coupon = require("../model/couponSchema");
const Wallet = require("../model/walletSchema");
const Payment = require("../model/paymentSchema");


const layout = "./layouts/adminLayout.ejs";

const Razorpay = require("razorpay");
const crypto = require("crypto");

var instance = new Razorpay({
  key_id: process.env.RAZ_KEY_ID,
  key_secret: process.env.RAZ_KEY_SECRET,
});

const checkProductExistence = async (item) => {
  const product = await Product.findById(item.product_id._id);
  console.log(product)
  if (!product || product.isBlocked) {
    throw new Error(`${product ? product.productName : "not available"}`);
  }
  
  return product;
};

const checkStockAvailability = async (item) => {
  const product = await Product.findById(item.product_id._id);

  if (product.quantity < item.quantity) {
    throw new Error(`${product.product_name}`);
  }

  return product;
};
const createRazorpayOrder = async (order_id, total) => {
  
  let options = {
    amount: total * 100, // amount in the smallest currency unit
    currency: "INR",
    receipt: order_id.toString(),
  };
  const order = await instance.orders.create(options);
  
  return order;
};


module.exports = {
  /**
   * User Side
   */
  // user place order

  // placeOrder: async (req, res) => {
  //   console.log(req.body);
  //   if (!req.body.address) {
  //     return res.json({ status: false, message: "Please add the address" });
  //   }

  //   const user = await User.findById(req.user.id);
  //   let status;
  //   if (
  //     req.body.paymentMethod === "COD" ||
  //     req.body.paymentMethod === "wallet"
  //   ) {
  //     status = "confirmed";
  //   } else {
  //     status = "pending";
  //   }

  //   const userCart = await Cart.findOne({ user_id: req.user.id }).populate(
  //     "items.product_id"
  //   );
  //   console.log(userCart);

  //   const address = await Address.findOne({ _id: req.body.address });

  //   if (address && userCart) {
  //     // let items = userCart.items;
  //     let items = [];
  //     userCart.items.forEach((item) => {
  //       items.push({
  //         product_id: item.product_id._id,
  //         quantity: item.quantity,
  //         price: item.product_id.sellingPrice,
  //         status,
  //       });
  //     });

  //     let order = {
  //       customer_id: user._id,
  //       items: items,
  //       address: address,
  //       payment_method: req.body.paymentMethod,
  //       total_amount: userCart.totalPrice,
  //       status: status,
  //     };

  //     if (req.body.paymentMethod === "COD") {
  //       const createOrder = await Order.create(order);
  //       if (createOrder) {
  //         //empty the cart
  //         await Cart.deleteOne({ user_id: req.user.id });

  //         //reduce the stock count
  //         for (let i = 0; i < items.length; i++) {
  //           await Product.updateOne(
  //             { _id: items[i].product_id._id },
  //             { $inc: { stock: -items[i].quantity } }
  //           );
  //         }
  //         req.session.order = {
  //           status: true,
  //         };
  //         res.json({
  //           success: true,
  //         });
  //         // console.log(req.body);
  //       }
  //     }
  //   }
  // },



  placeOrder: async (req, res) => {
    try {
      const { paymentMethod, address } = req.body;

      console.log(req.body);

      if (!req.body.address) {
        return res
          .status(400)
          .json({ status: false, message: "Please add the address" });
      }
      if (!req.body.paymentMethod) {
        return res
          .status(400)
          .json({ status: false, message: "Please select a payment method" });
      }
      const user = await User.findById(req.user.id).catch((error) => {
        console.error(error);
        return res.status(500).json({ error: "Failed to find user" });
      });

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      let cart = await Cart.findOne({ userId: user._id }).catch((error) => {
        console.error(error);
        return res.status(500).json({ error: "Failed to find user's cart" });
      });

      if (!cart) {
        return res.status(404).json({ error: "User's cart not found" });
      }
      const status =
        paymentMethod == "COD" || paymentMethod == "Wallet"
          ? "Confirmed"
          : "Pending";

      console.log(cart.items);
       
      let order;

      if(cart.coupon){
          order=new Order({
          customer_id: user._id,
          items : cart.items,
          totalPrice: cart.totalPrice,
          coupon: cart.coupon,
          couponDiscount: cart.couponDiscount,
          payable: cart.payable,
          paymentMethod,
          status,
          shippingAddress: address,
         
        })
        order.items.forEach((item) => {
          item.status = status;
        });
      }else{

           order = new Order({
          customer_id: user._id,
          items: cart.items,
          totalPrice: cart.totalPrice,
          payable: cart.payable,
          paymentMethod,
          status,
          shippingAddress: address,
        });
  
        order.items.forEach((item) => {
          item.status = status;
        });
      }
      // order.status = paymentMethod == "COD" ? "Confirmed" : "Pending";

      switch (paymentMethod) {
        case "COD":
          if (!order) {
            return res.status(500).json({ error: "Failed to create order" });
          }
          const orderPlaced = await order.save();

          if (orderPlaced) {
            // if coupon is used
            if (order.coupon) {
              await Coupon.findOneAndUpdate(
                { _id: cart.coupon },
                { $push: { usedBy: { userId: req.user.id } } }
              );
            }
          }

          for (const item of cart.items) {
            const product = await Product.findById(item.product_id);
            if (product) {
              product.quantity -= item.quantity;
              await product.save();
            }
          }

          if (orderPlaced) {
            
            for (const item of cart.items) {
              const product = await Product.findById(item.product_id).catch(
                (error) => {
                  console.error(error);
                  return res
                    .status(500)
                    .json({ error: "Failed to find product" });
                }
              );

              if (!product) {
                return res.status(404).json({ error: "Product not found" });
              }

              await product.save().catch((error) => {
                console.error(error);
                return res
                  .status(500)
                  .json({ error: "Failed to update product stock" });
              });
            }

            await Cart.clearCart(req.user.id).catch((error) => {
              console.error(error);
              return res
                .status(500)
                .json({ error: "Failed to clear user's cart" });
            });

            return res.status(200).json({
              success: true,
              message: "Order has been placed successfully.",
            });
          }

          break;

          case "Online":
          const createOrder = await Order.create(order);

          let total = parseInt(cart.payable);
          let order_id = createOrder._id;

          const RazorpayOrder = await createRazorpayOrder(order_id, total).then(
            (order) => order
          );

          const timestamp = RazorpayOrder.created_at;
          const date = new Date(timestamp * 1000); // Convert the Unix timestamp to milliseconds

          // Format the date and time
          const formattedDate = date.toISOString();

          //creating a instance for payment details
          let payment = new Payment({
            payment_id: RazorpayOrder.id,
            amount: parseInt(RazorpayOrder.amount) / 100,
            currency: RazorpayOrder.currency,
            order_id: order_id,
            status: RazorpayOrder.status,
            created_at: formattedDate,
          });

          //saving in to db
          await payment.save();

          return res.json({
            status: true,
            order: RazorpayOrder,
            user,
          });

          break;

        case "Wallet":

          const orderCreate = await Order.create(order);

          if(orderCreate){
            let wallet = await Wallet.findOne({ userId: req.user.id });
            
            wallet.balance = parseInt(wallet.balance) - parseInt(orderCreate.payable);
            
            wallet.transactions.push({
              date: new Date(),
              amount: parseInt(orderCreate.payable),
              message: "Order placed successfully",
              type: "Debit",
            })

            await wallet.save();

            // reduce stock of the variant
            for (const item of cart.items) {
              const product = await Product.findById(item.product_id).catch(
                (error) => {
                  console.error(error);
                  return res
                    .status(500)
                    .json({ error: "Failed to find product" });
                }
              );

              if (!product) {
                return res.status(404).json({ error: "Product not found" });
              }

              product.quantity -= item.quantity;

              await product.save().catch((error) => {
                console.error(error);
                return res
                  .status(500)
                  .json({ error: "Failed to update product stock" });
              });
            }

            await Cart.clearCart(req.user.id);

            orderCreate.status = "Confirmed";
            orderCreate.items.forEach((item) => {
              item.status = "Confirmed";
            });

            await orderCreate.save();

            // coupon is used
            if (order.coupon) {
              await Coupon.findOneAndUpdate(
                { _id: userCart.coupon },
                { $push: { usedBy: { userId: req.user.id } } }
              );
            }


            return res.status(200).json({
              success: true,
              message: "Order has been placed successfully.",
            });
          }

          break;
          
        default:
          return res.status(400).json({ error: "Invalid payment method" });
      }

    } catch (error) {
      console.error(error);
      res
        .status(500)
        .json({ error: "An error occurred while placing the order" });
    }
  },




  //  placeOrder: async (req, res) => {
  //   try {
  //     const { paymentMethod, address } = req.body;
  
  //     console.log(req.body);
  
  //     let shippingAddress = await Address.findOne({
  //       _id: address
  //     });
  
  //     shippingAddress = {
  //       name: Address.name,
  //       house_name: Address.house_name,
  //       locality: Address.locality, 
  //       area_street: Address.area_street,
  //       phone: Address.phone,
  //       address: Address.address,
  //       landmark: Address.landmark,
  //       city: Address.city,
  //       state: Address.state,
  //       zipcode: Address.zipcode,
  //       address: `${Address.name}, ${Address.house_name}(H),  ${Address.locality}, ${Address.town}, ${Address.state}, PIN: ${Address.zipcode}. PH: ${Address.phone}`
  //     }; 
  
  //     if (!req.body.address) {
  //       return res.status(400).json({ status: false, message: "Please add the address" });
  //     }
  //     if (!req.body.paymentMethod) {
  //       return res.status(400).json({ status: false, message: "Please select a payment method" });
  //     }
  
  //     const user = await User.findById(req.user.id).catch((error) => {
  //       console.error(error);
  //       return res.status(500).json({ error: "Failed to find user" });
  //     });
  
  //     if (!user) {
  //       return res.status(404).json({ error: "User not found" });
  //     }
  
  //     let userCart = await Cart.findOne({ userId: user._id }).catch((error) => {
  //       console.error(error);
  //       return res.status(500).json({ error: "Failed to find user's cart" });
  //     });
  
  //     if (!userCart) {
  //       return res.status(404).json({ error: "User's cart not found" });
  //     }
  
  //     const status = paymentMethod == "COD" || paymentMethod == "Wallet" ? "Confirmed" : "Pending";
  //     const paymentStatus = paymentMethod == "COD" || paymentMethod == "Wallet" ? "Paid" : "Pending";
      
  //     console.log(userCart.items);
  
  //     let order;
  
  //     if (userCart.coupon) {
  //       order = new Order({
  //         customer_id: user._id,
  //         items: userCart.items.map(item => ({
  //           product_id: item.product_id,
  //           quantity: item.quantity,
  //           price: item.price
  //         })),
  //         totalPrice: userCart.totalPrice,
  //         coupon: userCart.coupon,
  //         couponDiscount: userCart.couponDiscount,
  //         payable: userCart.payable,
  //         paymentMethod,
  //         paymentStatus,
  //         status,
  //         Address,
  //       });
  
  //       order.items.forEach((item) => {
  //         item.status = status;
  //       });
  
  //     } else {
  //       order = new Order({
  //         customer_id: user._id,
  //         items: userCart.items.map(item => ({
  //           product_id: item.product_id,
  //           quantity: item.quantity,
  //           price: item.price
  //         })),
  //         totalPrice: userCart.totalPrice,
  //         payable: userCart.payable,
  //         paymentMethod,
  //         paymentStatus,
  //         status,
  //         shippingAddress,
  //       });
  //     }
  
  //     // Save the order
  //     const orderPlaced = await order.save();
  
  //     if (!orderPlaced) {
  //       return res.status(500).json({ error: "Failed to create order" });
  //     }
  
  //     // Update stock of products
  //     for (const item of userCart.items) {
  //       const product = await Product.findById(item.product_id).catch((error) => {
  //         console.error(error);
  //         return res.status(500).json({ error: "Failed to find product" });
  //       });
  
  //       if (!product) {
  //         return res.status(404).json({ error: "Product not found" });
  //       }
  
  //       product.stock -= item.quantity;
  
  //       await product.save().catch((error) => {
  //         console.error(error);
  //         return res.status(500).json({ error: "Failed to update product stock" });
  //       });
  //     }
  
  //     // Clear user's cart
  //     await Cart.clearCart(req.user.id).catch((error) => {
  //       console.error(error);
  //       return res.status(500).json({ error: "Failed to clear user's cart" });
  //     });
  
  //     // Coupon is used
  //     if (order.coupon) {
  //       await Coupon.findOneAndUpdate(
  //         { _id: userCart.coupon },
  //         { $push: { usedBy: { userId: req.user.id } } }
  //       );
  //     }
  
  //     return res.status(200).json({
  //       success: true,
  //       message: "Order has been placed successfully.",
  //     });
  
  //   } catch (error) {
  //     console.error(error);
  //     res.status(500).json({ error: "An error occurred while placing the order" });
  //   }
  // },

  verifyPayment: async (req, res) => {
    try {
      const secret = process.env.RAZ_KEY_SECRET;

      const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
        req.body.response;
      console.log("payment verification: ", req.body, secret);
      let hmac = crypto.createHmac("sha256", secret);
      hmac.update(razorpay_order_id + "|" + razorpay_payment_id);
      hmac = hmac.digest("hex");
      const isSignatureValid = hmac === razorpay_signature;

      console.log(isSignatureValid);

      if (isSignatureValid) {
        let customer_id = req.user.id;

        let userCart = await Cart.findOne({ userId: customer_id }).catch(
          (error) => {
            console.error(error);
            return res
              .status(500)
              .json({ error: "Failed to find user's cart" });
          }
        );

        // reduce stock of the variant
        for (const item of userCart.items) {
          const product = await Product.findById(item.product_id).catch(
            (error) => {
              console.error(error);
              return res.status(500).json({ error: "Failed to find product" });
            }
          );

          if (!product) {
            return res.status(404).json({ error: "Product not found" });
          }

          const variantIndex = product.variants.findIndex(
            (variant) => variant._id.toString() === item.variant.toString()
          );

          if (variantIndex === -1) {
            return res.status(404).json({ error: "Variant not found" });
          }

          console.log(product.variants[variantIndex]);

          product.variants[variantIndex].stock -= item.quantity;

          await product.save().catch((error) => {
            console.error(error);
            return res
              .status(500)
              .json({ error: "Failed to update product stock" });
          });
        }

        //empty the cart
        await Cart.clearCart(req.user.id).catch((error) => {
          console.error(error);
          return res.status(500).json({ error: "Failed to clear user's cart" });
        });

        let paymentId = razorpay_order_id;

        const orderID = await Payment.findOne(
          { payment_id: paymentId },
          { _id: 0, order_id: 1 }
        );

        const order_id = orderID.order_id;

        const updateOrder = await Order.updateOne(
          { _id: order_id },
          { $set: { "items.$[].status": "Confirmed", "items.$[].paymentStatus": "Paid" , status: "Confirmed", paymentStatus: "Paid" } }
        );

        let couponId = await Order.findOne({ _id: order_id }).populate(
          "coupon"
        );

        console.log(couponId);
        if (couponId.coupon) {
          couponId = couponId.coupon._id;
          if (couponId) {
            let updateCoupon = await Coupon.findByIdAndUpdate(
              { _id: couponId },
              {
                $push: { usedBy: customer_id },
              },
              {
                new: true,
              }
            );
          }
        }
        req.session.order = {
          status: true,
        };
        res.json({
          success: true,
        });
      } else {
       
      }
    } catch (error) {
      console.log(error);
    }
  },
  orderConfirmation: async (req, res) => {},
  orderErrors: async (req, res) => {},

  

  // Order view
  getUserOrders: async (req, res) => {
    let user = await User.findById(req.user.id);

    let perPage = 6;
    let page = req.query.page || 1;

    let orderDetails = await Order.find({ customer_id: user._id })
      .select("_id items address payment_method status createdAt total_amount")
      .populate({
        path: "items.product_id",
        select: "name",
      })
      .skip(perPage * page - perPage)
      .limit(perPage)
      .sort({ createdAt: -1 })
      .exec();

    const count = await Order.countDocuments({ customer_id: user._id });
    const nextPage = parseInt(page) + 1;
    const hasNextPage = nextPage <= Math.ceil(count / perPage);

    res.render("user/orders", {
      orderDetails,
      current: page,
      pages: Math.ceil(count / perPage),
      nextPage: hasNextPage ? nextPage : null,
      currentRoute: "/user/orders/",
    });
  },

  getUserOrder: async (req, res) => {
    const locals = {
      title: "ministore - Orders",
    };

    try {
      const orderDetails = await Order.findOne({ _id: req.params.id }).populate(
        "items.product_id"
      );
      console.log(orderDetails.items);
      if (!orderDetails) {
        throw new Error("Order not found");
      }

      res.render("user/order", {
        locals,
        orderDetails,
        orderDetail: orderDetails,
        orderProducts: orderDetails.items,
        address: orderDetails.address,
        itemTotal: orderDetails.itemTotal,
      });
    } catch (error) {
      console.error("Error fetching order:", error);
      // Handle the error appropriately, for example:
      res.status(404).send("Order not found");
    }
  },

  /**
   * Admin Side
   */
  getOrders: async (req, res) => {
    const locals = {
      title: "Order Management",
    };

    let perPage = 10;
    let page = req.query.page || 1;

    try {
      let orderDetails = await Order.aggregate([
        {
          $project: {
            _id: 1,
            customer_id: 1,
            items: 1,
            address: 1,
            payment_method: 1,
            total_amount: 1,
            coupon: 1,
            couponDiscount: 1,
            // payable: 1,
            categoryDiscount: 1,
            paymentStatus: 1,
            orderStatus: 1,
            createdAt: 1,
          },
        },
        {
          $lookup: {
            from: "users",
            localField: "customer_id",
            foreignField: "_id",
            as: "user",
          },
        },
        { $unwind: { path: "$items" } },
        {
          $lookup: {
            from: "products",
            localField: "items.product_id",
            foreignField: "_id",
            as: "product_detail",
          },
        },
        {
          $addFields: {
            productDetails: { $arrayElemAt: ["$product_detail", 0] },
          },
        },
        {
          $project: {
            _id: 1,
            user: 1,
            items: 1,
            payment_method: 1,
            total_amount: 1,
            coupon: 1,
            couponDiscount: 1,
            // payable: 1,
            paymentStatus: 1,
            orderStatus: 1,
            createdAt: 1,
            productDetails: 1,
          },
        },
        { $sort: { createdAt: -1 } },
        { $skip: perPage * page - perPage },
        { $limit: perPage },
      ]);

      const count = await Order.countDocuments();
      const nextPage = parseInt(page) + 1;
      const hasNextPage = nextPage <= Math.ceil(count / perPage);

      res.render("admin/orders/orders", {
        locals,
        orders: orderDetails,
        current: page,
        pages: Math.ceil(count / perPage),
        nextPage: hasNextPage ? nextPage : null,
        currentRoute: "/admin/orders/",
        layout,
      });
    } catch (error) {
      console.error("Error fetching orders:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  },

  getOrderDetails: async (req, res) => {
    const orderId = req.params.id;

    try {
      const userCart = await Cart.findOne({ user_id: req.user.id });
      items:[
        {
          itemTotal: product.sellingPrice,
        }
      ]

      const orderDetails = await Order.findById(orderId)
        .populate("items.product_id")
        .populate("customer_id")
        .populate("address");

      res.render("admin/orders/viewOrder", {
        layout,
        orderDetails,
        userCart,
      });
    } catch (error) {
      console.log(error);
    }
  },
  // Cancel order
  cancelOrder: async (req, res) => {
    try {
        const { id, itemId } = req.params;

        // Find the order for the specific item
        let order = await Order.findOne({ _id: id, "items.product_id": itemId });

        // If the order is not found, send an error
        if (!order) {
            return res.status(404).json({ message: "Order not found." });
        }

        // Update the order status for the specific item
        const updateOrder = await Order.updateOne(
            {
                _id: id,
                "items.product_id": itemId,
            },
            {
                $set: {
                    "items.$.status": "Cancelled",
                    "items.$.cancelled_on": new Date(),
                },
            },
            { new: true }
        );

        // Restore the product stock
        let product = await Product.findById(itemId);

        // Find the specific item within the order
        let currentItem = order.items.find(
            (item) => item.product_id.toString() === itemId
        );

        if (currentItem) {
            let quantity = parseInt(currentItem.quantity);
            if (isNaN(quantity)) {
                quantity = 0;
            }
            product.stock += quantity;
        } else {
            // Handle case where the item is not found in the order
            return res.status(404).json({ message: "Item not found in the order." });
        }

        await product.save();

        res.status(200).json({
            success: true,
            message: "Order cancelled successfully.",
            order: updateOrder,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal Server error." });
    }
},


  changeOrderStatus: async (req, res) => {
    const order_id = req.params.id;

    const { product_id, status } = req.body;

    console.log(req.body);
    try {
      let order = await Order.findOne({
        _id: order_id,
        "items.product_id": product_id,
      });
      if (!order) {
        return res.status(400).json({
          success: false,
          message: "Order not Found",
        });
      }
      console.log(order);
      order.items[0].status = status;
      await order.save();
      return res.status(200).json({
        success: true,
        message: "orderStatus is Succefully Changed.",
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  },
};

