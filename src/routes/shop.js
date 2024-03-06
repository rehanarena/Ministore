const express = require("express");
const router = express.Router();
const cartController = require("../controller/cartController");
const checkoutController = require("../controller/checkoutController")
const shopController = require("../controller/shopController");

/* GET cart page. */
router
  .route("/cart")
  .get( cartController.getcart)
  



/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Ministore' });
});


  module.exports = router;


  /* GET checkout page. */
  router
  .route("/checkout")
  .get( checkoutController.getcheckout)

  /* GET ProductList page. */
  router
  .route("/productList")
  .get( shopController.getproductList)




  /* GET ProducDetails page. */
  router
  .route("/productDetails")
  .get( shopController.getproductDetails)