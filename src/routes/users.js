const express = require("express");
const router = express.Router();
const User = require("../model/userSchema");
const order = require("../model/orderSchema");
const WishList = require("../model/wishlistSchema");

const { isLoggedIn } = require("../middlewares/authMiddleware");
const userController = require("../controller/userController");
const orderController = require("../controller/orderController");


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




/**
 * User Order Management
 */

router.post("/place-order", orderController.placeOrder);

router.route("/orders").get(orderController.getUserOrders);
router.get("/order/:id", orderController.getUserOrder);
router.post("/cancel-order/:id", orderController.cancelOrder);


// router.route("/cancel-order/:id").post(orderController.cancelOrder)





/**
 * User Refferals
 */

router.get("/refferals", userController.getRefferals);






module.exports = router;