const express = require("express");
const router = express.Router();
const User = require("../model/userSchema");
const order = require("../model/orderSchema");
const WishList = require("../model/wishlistSchema");

const { isLoggedIn } = require("../middlewares/authMiddleware");
const userController = require("../controller/userController");
const orderController = require("../controller/orderController");
const checkoutController = require("../controller/checkoutController");
const couponController = require("../controller/couponController");


    /**
 * User Profile
 */

router
.route("/profile")
.get(userController.getProfile)
.post(userController.editProfile);

router.route("/reset-password")
.post(userController.resetPass);


/**
 * User Address
 */

router.route("/address")
.get(userController.getAddress);
router.route("/address/add-address")
.post(userController.addAddress);

router
  .route("/address/edit-address/:id")
  .get(userController.getEditAddress)
  .post(userController.editAddress)
  // .delete(userController.deleteAddress);

router
  .route("/address/delete-address/:id")
  .delete(userController.deleteAddress);




  /**
 * User Wishlist
 */

router.get("/wishlist", userController.getWishlist);
router.post("/add-to-wishlist", userController.addToWishlist);
router.delete("/remove-from-wishlist", userController.removeFromWishlist);

// router.delete("/remove-from-wishlist", userController.removeFromWishlist);




/**
 * User Order Management
 */
router.post("/apply-coupon",checkoutController.applyCoupon)
router.post("/remove-coupon", checkoutController.removeCoupon);
router.post("/place-order", orderController.placeOrder);
router.post("/verify-payment", orderController.verifyPayment);
router.post("/return-order/", orderController.returnOrder);



router.route("/orders").get(orderController.getUserOrders);
router.get("/order/:id", orderController.getUserOrder);
router.post("/cancel-order/:id/:itemId", orderController.cancelOrder);


// invoice
router.get("/invoice/:id/:itemId", orderController.getInvoice);
// router.get("/invoice/download/:id/:itemId", orderController.downloadInvoice);

/**
 * User Wallet
 */

router.get("/wallet", userController.getWallet);
router.post('/add-to-wallet', userController.addToWallet)
router.post('/verify-wallet-payment', userController.verifyPayment)




/**
 * User Refferals
 */

router.get("/refferals", userController.getRefferals);






module.exports = router;