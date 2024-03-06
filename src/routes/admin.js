const express = require("express");
const router = express.Router();

const adminController = require("../controller/adminController");
const categoryController = require("../controller/categoryController");
const productController = require("../controller/productController");


const { isAdmin } = require("../middlewares/authMiddleware");

// const { productUpload } = require("../middlewares/multer");

router.get("/", adminController.getDashboard);





/**
 * Customer Management
 */

router.route("/users").get(adminController.getUsersList);

// router.route("/users/toggle-block/:id").patch(adminController.toggleBlock)



/**
 * Category Management
 */

router.route("/category").get(categoryController.getAllCategory);

router
  .route("/category/add-category")
  .get(categoryController.getAddCategory)
  .post( categoryController.addCategory);




  /**
 * Product Management
 */

router.route("/products")
.get(productController.getAllProducts)


router.route("/products/add-product")
.get(productController.getAddProduct)

router.route("/products/edit-product/:id")
.get(productController.getEditProduct)


module.exports = router;