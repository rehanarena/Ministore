const mongoose = require("mongoose");
const Product = require("../model/productSchema");
const Cart = require("../model/cartSchema");
const User = require("../model/userSchema");
const Address = require("../model/addressSchema");
const Order = require("../model/orderSchema");
const Payment = require("../model/paymentSchema");
const Wallet = require("../model/walletSchema");
const Coupon = require("../model/couponSchema");








module.exports = {

  getCheckout: async (req, res) => {
   
    const userCart = await Cart.findOne({ user_id: req.user.id }).populate(
      "items.product_id"
    );
    if(!userCart){
      return res.redirect('/user/cart')
    }
    if(!userCart.items.length>0){
      return res.redirect('/user/cart')
    }
    const address = await Address.find({
      customer_id: req.user.id,
    });

    let totalPrice = 0;
    let totalPriceBeforeOffer = 0;
    for (const prod of userCart.items) {
      prod.price = prod.product_id.onOffer
        ? prod.product_id.offerDiscountPrice
        : prod.product_id.sellingPrice;

      const itemTotal = prod.price * prod.quantity;
      prod.itemTotal = itemTotal;
      totalPrice += itemTotal;
      totalPriceBeforeOffer += prod.price;
    }
    // Correctly declare the variable before the loop
    
    // for (let prod of userCart.items) {
    //   prod.itemTotal += prod.product_id.sellingPrice * prod.quantity;
    //   totalPrice += prod.itemTotal;
    // }
    
     // Apply coupon discount if applicable
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
       } else {
         // If the total is less than the minimum purchase amount, remove the coupon
         userCart.coupon = undefined;
         userCart.couponDiscount = 0;
         await userCart.save();
       }
     }
      // Correctly calculate cartCount
    let cartCount = userCart.items.length;

    const coupons = await Coupon.find({
      isActive: true,
      minPurchaseAmount: { $lte: totalPrice },
      expirationDate: { $gte: Date.now() },
      // usedBy: [{ $not: req.user.id }],
    });
    // console.log(coupons);

    let userWallet = await Wallet.findOne({ userId: req.user.id });

    if (!userWallet) {
      userWallet = {
        balance: 0,
        transactions: [],
        isInsufficient: true
      }
    }

    let isCOD = true;

    if(totalPrice > 1000){
      isCOD = false;
    }

    if(totalPrice > userWallet.balance){
      userWallet.isInsufficient = true;
    }else{
      userWallet.isInsufficient = false;
    }

    const locals = {
      title: "Ministore - Checkout",
    };

    res.render("shop/checkout", {
      locals,
      userCart,
      address,
      isCOD,
      cartList: userCart.items,
      cartCount,
      coupons,
      totalPrice,
      couponDiscount,
      wallet: userWallet,
      checkout: true,
    
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
  applyCoupon: async(req,res)=>{
    console.log(req.body);
    try {
      let { code } = req.body;
      code = code.trim().toLowerCase();
      let couponCode = await Coupon.findOne({code: {$regex: code, $options: "i"}})

      if(!couponCode){
        return res.status(400).json({success: false, message: "Couponcode no found"});

      }

      const currentDate = new Date()
      const expirationDate = new Date(couponCode.expirationDate)

      if(expirationDate < currentDate || !couponCode.isActive){
        return res.status(400).json({success: false, message: " couponCode is Expired or inactive"})
      }

      let userCart = await Cart.findOne({user_id: req.user.id});
      if(!userCart){
        return res.status(400).json({success:false, message: "no cart found for user"})

      }

      const totalprice = userCart.totalPrice
      if(totalprice < couponCode.minPurchaseAmount ){
        return res.status(400).json({success: false, message: "totalprice is lessthan minPurchaseAmt for this product"})
      }

      // Check if the coupon is already applied
      if (
        userCart.coupon &&
        userCart.coupon.toString() === couponCode._id.toString()
      ) {
        return res
          .status(400)
          .json({ success: false, message: "Coupon is already in use." });
      }

      let discountAmt = totalprice * (couponCode.rateOfDiscount / 100)

      userCart.coupon = couponCode._id;
      userCart.couponDiscount = discountAmt;


      await userCart.save()

      return res.status(200).json({success: true, message: "Coupon applied Succesfully"})


    } catch (error) {
      console.log(error);
      return res.status(500).json({ success: false, message: "An error occurred." });
    }
  },

  removeCoupon: async (req, res) => {
    try {
      // Check if the cart exists and the user is associated with it
      const userCart = await Cart.findOne({ user_id: req.user.id });

      console.log(userCart);
      if (!userCart) {
        return res.status(404).json({ message: "Cart not found" });
      }

      // Set coupon to undefined
      userCart.coupon = undefined;
      userCart.couponDiscount = 0; // Reset the coupon discount to 0

      await userCart.save();
      return res.status(200).json({ message: "Coupon removed successfully" });
    } catch (error) {
      console.error("Error removing coupon:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  },
};