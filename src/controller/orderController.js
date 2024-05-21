const mongoose = require("mongoose");

const easyinvoice = require("easyinvoice");
const Order = require("../model/orderSchema");
const User = require("../model/userSchema");
const Product = require("../model/productSchema");
const Address = require("../model/addressSchema");
const Cart = require("../model/cartSchema");
const Coupon = require("../model/couponSchema");
const Wallet = require("../model/walletSchema");
const Return = require("../model/returnSchema");
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
  console.log(product);
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

  placeOrder: async (req, res) => {
    try {
      const { paymentMethod, address } = req.body;

      console.log(req.body);

      let shippingAddress = await Address.findOne({
        _id: address,
      });

      console.log(shippingAddress);

      shippingAddress = {
        name: shippingAddress.name,
        house_name: shippingAddress.house_name,
        locality: shippingAddress.locality,
        area_street: shippingAddress.area_street,
        town: shippingAddress.town,
        phone: shippingAddress.phone,
        address: shippingAddress.address,
        landmark: shippingAddress.landmark,
        city: shippingAddress.city,
        state: shippingAddress.state,
        zipcode: shippingAddress.zipcode,
        address: `${shippingAddress.name}, ${shippingAddress.house_name}(H),  ${shippingAddress.locality}, ${shippingAddress.town}, ${shippingAddress.state}, PIN: ${shippingAddress.zipcode}. PH: ${shippingAddress.phone}`,
      };

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

      const user = await User.findById(req.user.id);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      let userCart = await Cart.findOne({ user_id: user._id });

      if (!userCart) {
        return res.status(404).json({ error: "User's cart not found" });
      }

      const status =
        paymentMethod == "COD" || paymentMethod == "Wallet"
          ? "Confirmed"
          : "Pending";
      const paymentStatus =
        paymentMethod == "COD" || paymentMethod == "Wallet"
          ? "paid"
          : "pending";

      console.log(userCart);

      let order;

      if (userCart.coupon) {
        let payable = userCart.totalPrice - userCart.couponDiscount;
        order = new Order({
          customer_id: user._id,
          items: userCart.items.map((item) => ({
            product_id: item.product_id,
            quantity: item.quantity,
            price: item.price,
          })),
          totalPrice: userCart.totalPrice,
          coupon: userCart.coupon,
          couponDiscount: userCart.couponDiscount,
          payable,
          paymentMethod,
          paymentStatus,
          status,
          address: shippingAddress,
        });

        order.items.forEach((item) => {
          item.status = status;
        });
      } else {
        order = new Order({
          customer_id: user._id,
          items: userCart.items.map((item) => ({
            product_id: item.product_id,
            quantity: item.quantity,
            price: item.price,
          })),
          totalPrice: userCart.totalPrice,
          payable: userCart.payable || userCart.totalPrice,
          paymentMethod,
          paymentStatus,
          status,
          address: shippingAddress,
        });
      }

      // Save the order

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
                { _id: userCart.coupon },
                { $push: { usedBy: { userId: req.user.id } } }
              );
            }
          }

          for (const item of userCart.items) {
            const product = await Product.findById(item.product_id);
            if (product) {
              product.quantity -= item.quantity;
              await product.save();
            }
          }

          if (orderPlaced) {
            for (const item of userCart.items) {
              const product = await Product.findById(item.product_id);

              console.log(product);
              if (!product) {
                return res.status(404).json({ error: "Product not found" });
              }

              await product.save();
            }
            // TODO: implement CartClearning

            await Cart.updateOne(
              { user_id: user._id },
              {
                $set: {
                  items: [],
                  totalPrice: 0,
                  coupon: null,
                  couponDiscount: 0,
                  payable: 0,
                },
              }
            );

            return res.status(200).json({
              success: true,
              message: "Order has been placed successfully.",
            });
          }

          break;

        case "Online":
          const createOrder = await Order.create(order);
          let payable = userCart.coupon
            ? userCart.totalPrice - userCart.couponDiscount
            : userCart.totalPrice;

          let total = parseInt(payable);
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

          if (orderCreate) {
            let wallet = await Wallet.findOne({ userId: req.user.id });

            wallet.balance =
              parseInt(wallet.balance) - parseInt(orderCreate.payable);

            wallet.transactions.push({
              date: new Date(),
              amount: parseInt(orderCreate.payable),
              message: "Order placed successfully",
              type: "Debit",
            });

            await wallet.save();

            // reduce stock of the variant
            for (const item of userCart.items) {
              const product = await Product.findById(item.product_id);

              if (!product) {
                return res.status(404).json({ error: "Product not found" });
              }

              product.quantity -= item.quantity;

              await product.save();
            }

            // TODO: clear cart
            await Cart.updateOne(
              { userId: user._id },
              {
                $set: {
                  items: [],
                  totalPrice: 0,
                  coupon: null,
                  couponDiscount: 0,
                  payable: 0,
                },
              }
            );

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

      // Update stock of products
      for (const item of userCart.items) {
        const product = await Product.findById(item.product_id);

        if (!product) {
          return res.status(404).json({ error: "Product not found" });
        }

        product.stock -= item.quantity;

        await product.save();
      }

      // Coupon is used
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
    } catch (error) {
      console.error(error);
      res
        .status(500)
        .json({ error: "An error occurred while placing the order" });
    }
  },

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

        let userCart = await Cart.findOne({ user_id: customer_id });
        //stock reduce
        for (const item of userCart.items) {
          const product = await Product.findById(item.product_id);

          if (!product) {
            return res.status(404).json({ error: "Product not found" });
          }

          product.stock -= item.quantity;

          await product.save();
        }

        //empty the cart
        // TODO: clear cart

        await Cart.updateOne(
          { user_id: customer_id }, // Change userId to user_id
          {
            $set: {
              items: [],
              totalPrice: 0,
              coupon: null,
              couponDiscount: 0,
              payable: 0,
            },
          }
        );

        let paymentId = razorpay_order_id;

        const orderID = await Payment.findOne(
          { payment_id: paymentId },
          { _id: 0, order_id: 1 }
        );

        const order_id = orderID.order_id;

        const updateOrder = await Order.updateOne(
          { _id: order_id },
          {
            $set: {
              "items.$[].status": "Confirmed",
              "items.$[].paymentStatus": "paid",
              status: "Confirmed",
              paymentStatus: "paid",
            },
          }
        );

        let couponId = await Order.findOne({ _id: order_id });

        if (couponId.coupon) {
          console.log(couponId.coupon);

          // if (couponId) {
          //   let updateCoupon = await Coupon.updateOne(
          //     { _id: couponId.coupon},
          //     {
          //       $push: { usedBy: req.user.id },
          //     },
          //     {
          //       new: true,
          //     }
          //   );
          // }
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

      if (!orderDetails) {
        throw new Error("Order not found");
      }

      let totalPrice = 0;
      orderDetails.items.forEach((item) => {
        totalPrice += item.price * item.quantity;
      });

      for (const item of orderDetails.items) {
        switch (item.status) {
          case "Confirmed":
            // Set appropriate flags based on status
            break;
          case "Shipped":
            // Set appropriate flags based on status
            break;
          case "Out for Delivery":
            // Set appropriate flags based on status
            break;
          case "Delivered":
            // Set appropriate flags based on status
            break;
          case "Cancelled":
          case "In-Return":
          case "Returned":
            // Set appropriate flags based on status
            item.cancelled_on = orderDetails.updatedAt.toLocaleString(); // Include cancellation date
            break;
          default:
          // Handle other status if needed
        }
      }

      res.render("user/order", {
        locals,
        orderDetails,
        totalPrice: totalPrice,
        orderProducts: orderDetails.items,
        address: orderDetails.address,
        totalPrice,
      });
    } catch (error) {
      console.error("Error fetching order:", error);
      res.status(404).send("Order not found");
    }
  },
  // Get Invoice
  getInvoice: async (req, res) => {
    const invoiceId = `SS${Math.floor(1000 + Math.random() * 9000)}`;

    const locals = {
      title: `Invoice - ${invoiceId}`,
    };
    const { id, itemId } = req.params;

    console.log(id, itemId);
    const orderDetails = await Order.findOne({ _id: req.params.id }).populate(
      "items.product_id"
    );

    const userCart = await Cart.findOne({ user_id: req.user.id }).populate(
      "items.product_id"
    );

    let order = await Order.aggregate([
      {
        $unwind: "$items",
      },
      {
        $lookup: {
          from: "products",
          localField: "items.product_id",
          foreignField: "_id",
          as: "items.product",
        },
      },
      {
        $set: {
          "items.product": {
            $arrayElemAt: ["$items.product", 0],
          },
        },
      },
      {
        $project: {
          _id: 1,
          items: 1,
          address: 1,
          paymentMethod: 1,
          totalPrice: 1,
          coupon: 1,
          couponDiscount: 1,
          payable: 1,
          categoryDiscount: 1,
          paymentStatus: 1,
          orderStatus: 1,
          createdAt: 1,
          updatedAt: 1,
        },
      },
    ]);

    console.log(order[0]);

    let totalPrice = 0;
    orderDetails.items.forEach((item) => {
      totalPrice += item.price * item.quantity;
    });

    let couponDiscount = 0;
    if (userCart.coupon) {
      const coupon = await Coupon.findById(userCart.coupon);
      if (
        coupon &&
        coupon.isActive &&
        new Date() <= coupon.expirationDate &&
        totalPrice >= coupon.minPurchaseAmount
      ) {
        couponDiscount = totalPrice * (coupon.rateOfDiscount / 100);
        totalPrice -= couponDiscount;
      }
    }

    res.render("user/invoice-pdf", {
      order: order[0],
      user: req.user,
      invoiceId,
      orderDetails,
      orderProducts: orderDetails.items,
      userCart,
      couponDiscount,
      totalPrice,
      locals,
      layout: "./layouts/docs/invoice.ejs",
    });
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
            paymentMethod: 1,
            total_amount: 1,
            coupon: 1,
            couponDiscount: 1,
            payable: 1,
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
            paymentMethod: 1,
            total_amount: 1,
            coupon: 1,
            couponDiscount: 1,
            payable: 1,
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
      const orderDetails = await Order.findById(orderId)
        .populate("items.product_id")
        .populate("customer_id")
        .populate("address");

      res.render("admin/orders/viewOrder", {
        layout,
        orderDetails,
      });
    } catch (error) {
      console.log(error);
    }
  },
  // Cancel order
  // cancelOrder: async (req, res) => {
  //   try {
  //     const { id, itemId } = req.params;

  //     // Find the order for the specific item
  //     let order = await Order.findOne({ _id: id, "items.product_id": itemId });

  //     // If the order is not found, send an error
  //     if (!order) {
  //       return res.status(404).json({ message: "Order not found." });
  //     }

  //     // Find the specific item within the order
  //     let currentItem = order.items.find(
  //       (item) => item.product_id.toString() === itemId
  //     );

  //     if (!currentItem) {
  //       return res
  //         .status(404)
  //         .json({ message: "Item not found in the order." });
  //     }

  //     // Update the order status for the specific item
  //     const updateOrder = await Order.updateOne(
  //       {
  //         _id: id,
  //         "items.product_id": itemId,
  //       },
  //       {
  //         $set: {
  //           "items.$.status": "Cancelled",
  //           "items.$.cancelled_on": new Date(),
  //         },
  //       },
  //       { new: true }
  //     );

  //     // Restore the product stock
  //     let product = await Product.findById(itemId);
  //     let quantity = parseInt(currentItem.quantity);
  //     if (isNaN(quantity)) {
  //       quantity = 0;
  //     }
  //     product.stock += quantity;
  //     await product.save();

  //     // Credit the user's wallet if the item was prepaid
  //     if (currentItem.prepaid) {
  //       const user = await User.findById(order.user_id);
  //       if (user) {
  //         user.walletBalance += currentItem.amountPaid; // Adjust the amount if necessary
  //         await user.save();
  //       } else {
  //         return res.status(404).json({ message: "User not found." });
  //       }
  //     }

  //     res.status(200).json({
  //       success: true,
  //       message: "Order cancelled successfully.",
  //       order: updateOrder,
  //     });
  //   } catch (error) {
  //     console.error(error);
  //     res.status(500).json({ message: "Internal Server error." });
  //   }
  // },
  cancelOrder: async (req, res) => {
    console.log(req.params);

    const { id, itemId } = req.params;
    try {
      const order = await Order.findOne({
        _id: id,
        "items.product_id": itemId,
      });
      if (!order) {
        return res
          .status(400)
          .json({ success: false, message: "order is not found" });
      }
      console.log(order);

      const updatedOrder = await Order.updateOne(
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
      console.log(updatedOrder);
      if (!updatedOrder) {
        return res.status(500).json({ message: "Failed to cancel order." });
      }

      if (
        order.paymentMethod === "Wallet" ||
        order.paymentMethod === "Online"
      ) {
        let price = await Order.aggregate([
          {
            $match: {
              _id: new mongoose.Types.ObjectId(id),
            },
          },
          {
            $unwind: "$items",
          },
          {
            $project: {
              _id: 0,
              itemTotal: "$items.itemTotal",
            },
          },
        ]);
        console.log(price);

        const wallet = await Wallet.findOne({ userId: req.user.id });

        if (!wallet) {
          const newWallet = new Wallet({
            userId: req.user.id,
            balance: parseInt(price[0].itemTotal),
            transactions: [
              {
                date: new Date(),
                amount: parseInt(price[0].itemTotal),
                message: "Order cancelled successfully",
                type: "Credit",
              },
            ],
          });

          await newWallet.save();
        } else {
          wallet.balance =
            parseInt(wallet.balance) + parseInt(price[0].itemTotal);

          wallet.transactions.push({
            date: new Date(),
            amount: parseInt(price[0].itemTotal),
            message: "Order cancelled successfully",
            type: "Credit",
          });

          await wallet.save();
        }
      }

      const updateOrder = await Order.findOne({
        _id: id,
      });
      console.log(updateOrder);

      res.status(200).json({
        message: "Order cancelled successfully.",
        order: updatedOrder,
      });
    } catch (error) {
      console.error(error);
      return res
        .status(500)
        .json({ success: false, message: "internal server error", error });
    }
  },

  returnOrder: async (req, res) => {
    console.log(req.body);
    try {
      let retrn = new Return({
        user_id: req.user.id,
        order_id: req.body.order_id,
        product_id: req.body.product_id,
        item_id: req.body.item_id,
        reason: req.body.reason,
        status: "pending",
        comment: req.body.comment,
      });
      retrn.save();
      const updatedOrder = await Order.updateOne(
        {
          _id:req.body.order_id,
          "items.product_id":req.body.product_id,
        },
        {
          $set: {
            "items.$.status": "Return requested",
           
          },
        },
        { new: true }
      );
      console.log(updatedOrder);
    } catch (error) {
      console.error(error);
      return res.status(500).json({
        sucess: false,
        message: "internal server error",
      });
    }

    res.json({
      success: true,
    });
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
