const express = require("express");
const router = express.Router();
const cartController = require("../controller/cartController");
const checkoutController = require("../controller/checkoutController")
const shopController = require("../controller/shopController");

const Category = require("../model/categorySchema");
const Product = require("../model/productSchema");


const {isLoggedIn,} = require("../middlewares/authMiddleware");
const { cartList } = require("../middlewares/cartMiddleware");
const userController = require("../controller/userController");



router.use((req, res, next) => {
   if (req.isAuthenticated()) {
     res.locals.user = req.user;
     res.locals.cartCount = req.user.cart.length;
   }
   // res.locals.success = req.flash("success");
   // res.locals.error = req.flash("error");
   next();
 });



//  console.log(cartController);
/* GET cart page. */
router.get("/user/cart", isLoggedIn, cartController.getCart);









router.post("/user/add-to-cart/", cartController.addToCart);


router.get(
   "/cart/remove-from-cart/:id", cartController.removeCartItem
 );


 router.get(
   "/cart/increase-quantity/:id",
   cartController.incrementCartItem
 );


 router.get(
   "/cart/decrease-quantity/:id",
   cartController.decrementCartItem
 );





  



/* GET home page. */

router.get('/', async function(req, res, next) {
 try {
    const categories = await Category.find({ isActive: true });
    const products = await Product.find({}); // Fetch all products, adjust the query as necessary
    res.render('index', { title: 'Ministore', categories: categories, products: products });
 } catch (error) {
    next(error); // Pass the error to the next middleware for error handling
 }
});
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







  module.exports = router;
