const express = require("express");
const router = express.Router();

const shopController = require("../controller/shopController");


const Category = require("../model/categorySchema");
const Product = require("../model/productSchema");
const Cart = require('../model/cartSchema');

const userController = require("../controller/userController");

router.use((req, res, next) => {
  if (req.isAuthenticated()) {
    res.locals.user = req.user;
    // res.locals.cartCount = req.user.cart.length;
  }
  // res.locals.success = req.flash("success");
  // res.locals.error = req.flash("error");
  next();
});

/* GET home page. */

router.get("/", async function (req, res, next) {
  try {
    const categories = await Category.find({ isActive: true });
    const products = await Product.find({}); 
    const userCart = await Cart.findOne({ 'items.product_id': { $exists: true } });

    res.render("index", {
      title: "Ministore",
      categories: categories,
      products: products,
      userCart: userCart,
    });
  } catch (error) {
    next(error); // Pass the error to the next middleware for error handling
  }
});


/* GET ProductList page. */

// router
//   .route("/productList")
//   .get(shopController.getProductList)
/* GET search page. */
router.get("/search", shopController.search)

/* GET ProducDetails page. */
router.route("/productDetails").get(shopController.getProductDetails);

router.get("/order-success", shopController.getOrderSuccess);


module.exports = router;
