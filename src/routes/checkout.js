const express = require("express");
const router = express.Router();


const { isLoggedIn } = require("../middlewares/authMiddleware");
const checkoutController = require("../controller/checkoutController");
const cartController = require("../controller/cartController");
const userController = require("../controller/userController");
const couponController = require("../controller/couponController");
const shopController = require("../controller/shopController");

router.use(isLoggedIn);



/* GET checkout page. */
router.get("/checkout", checkoutController.getCheckout);

/* post checkout Page */
router.post("/checkout/add-address", checkoutController.addAddress);

router
  .route("/checkout/edit-address/:id")
  .get(userController.getEditAddress)
  
  router.post('/checkout/edit-address/:id',checkoutController.editAddress)

  /*delete address from checkout */
  router.delete('/checkout/edit-address/:id', checkoutController.deleteAddress);


  router.get('/orderConfirm',shopController.getOrderSuccess)
  /**
 * User Order Management
 */

// router.post("/place-order", checkoutController.placeOrder);





/**
 * User Coupon Management
 */

router.post("/verify-coupon", couponController.applyCoupon);
router.post("/remove-coupon", couponController.removeCoupon);


module.exports = router;
