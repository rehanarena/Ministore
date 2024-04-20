const Order = require("../model/orderSchema");
const User = require("../model/userSchema");
const Product = require("../model/productSchema");
const Address = require("../model/addressSchema");
const Cart = require("../model/cartSchema");

const layout = "./layouts/adminLayout.ejs";

module.exports = {
  /**
   * User Side
   */
  // user place order


  placeOrder: async (req, res) => {
    console.log(req.body);
    if (!req.body.address) {
      return res.json({ status: false, message: "Please add the address" });
    }

    const user = await User.findById(req.user.id);
    let status;
    if (
      req.body.paymentMethod === "COD" ||
      req.body.paymentMethod === "wallet"
    ) {
      status = "confirmed";
    } else {
      status = "pending";
    }

    const userCart = await Cart.findOne({ user_id: req.user.id }).populate(
      "items.product_id"
    );
    console.log(userCart);

    const address = await Address.findOne({ _id: req.body.address });

    if (address && userCart) {
      // let items = userCart.items;
      let items = []
      userCart.items.forEach((item)=>{
        items.push({
          product_id: item.product_id._id,
          quantity: item.quantity,
          price: item.product_id.sellingPrice,
          status,
          
        })
      })


      let order = {
        customer_id: user._id,
        items: items,
        address: address,
        payment_method: req.body.paymentMethod,
        total_amount: userCart.totalPrice,
        status: status,
      };

      if (req.body.paymentMethod === "COD") {
        const createOrder = await Order.create(order);
        if (createOrder) {
          //empty the cart
          await Cart.deleteOne({user_id:req.user.id})

          //reduce the stock count
          for (let i = 0; i < items.length; i++) {
            await Product.updateOne(
              { _id: items[i].product_id._id },
              { $inc: { stock: -items[i].quantity } }
            );
          }
          req.session.order = {
            status: true,
          };
          res.json({
            success: true,
          });
          // console.log(req.body);
        }
      }
    }
  },

  // Order view
  getUserOrders: async (req, res) => {
    let user = await User.findById(req.user.id);

    let perPage = 6;
    let page = req.query.page || 1;

    let orderDetails = await Order.find({ customer_id: user._id })
        .select('_id items address payment_method status createdAt total_amount')
        .populate({
            path: 'items.product_id',
            select: 'name' ,
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
      const orderDetails = await Order.findOne({ _id: req.params.id }).populate("items.product_id");
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
      const orderDetails = await Order.findById(orderId)
          .populate('items.product_id')
          .populate('customer_id')
          .populate('address');

      res.render("admin/orders/viewOrder", {
          layout,
          orderDetails,
         
      });
  } catch (error) {
      console.log(error);
  }
},
cancelOrder: async (req, res) => {
  try {
    const  id = req.params;

    const order = await Order.findOne({ _id: id });

    if (!order) {
      return res.status(404).json({ message: "Order not found." });
    }

    const updatedOrder = await Order.updateOne(
      { _id: id },
      {
        $set: {
          "items.$.status": "Cancelled",
          "items.$.cancelled_on": new Date(),
        },
      },
      { new: true }
    );

    if (!updatedOrder) {
      return res.status(500).json({ message: "Failed to cancel order." });
    }

    // Restore product stock
    const updateOrder = await Order.findOne({
      _id: id,
     
    });

    for (const item of updateOrder.items) {
      const product = await Product.findById(item.product_id);
      if (product) {
        product.stock += item.quantity;
        await product.save(); // Save the updated product
      }
    }

    res.status(200).json({
      message: "Order cancelled successfully.",
      order: updatedOrder,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error." });
  }
},


cancelAllOrders: async (req, res) => {
  try {
    const { orderId } = req.params;

    const updatedOrder = await Order.updateOne(
      { _id: orderId },
      {
        $set: {
          status: "Cancelled",
          "items.$.status": "Cancelled",
          "items.$[elem].cancelled_on": new Date(),
        },
      },
      {
        arrayFilters: [{ "elem.status": { $ne: "cancelled" } }],
      },
      { new: true }
    );

    if (updatedOrder) {
      const updateOrder = await Order.findOne({ _id: orderId });
      for (const item of updateOrder.items) {
        const product = await Product.findById(item.product_id);
        if (product) {
          const variantIndex = product.variants.findIndex(
            (variant) => variant._id.toString() === item.variant.toString()
          );

          if (variantIndex === -1) {
            return res.status(404).json({ error: "Variant not found" });
          }

          product.variants[variantIndex].stock += item.quantity;

          await product.save(); // Save the updated product
        }
      }
    }

    res.status(200).json({
      message: "Orders cancelled successfully.",
      order: updatedOrder,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server error." });
  }
},

changeOrderStatus: async (req, res) => {
  const order_id = req.params.id;

  const { product_id, status } = req.body;

  console.log(req.body);
 try {
  let order = await Order.findOne({_id: order_id,"items.product_id": product_id})
  if(!order){
    return res.status(400).json({
      success: false,
      message: 'Order not Found',
    })
  }
  console.log(order);
  order.items[0].status = status
  await order.save()
  return res.status(200).json({
    success: true,
    message: 'orderStatus is Succefully Changed.'
  })
 } catch (error) {
  console.error(error);
  return res.status(500).json({
    success: false,
    message: error.message
  })
 }
},

};