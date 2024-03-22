const express = require("express");
const router = express.Router();

const adminController = require("../controller/adminController");
const categoryController = require("../controller/categoryController");
const productController = require("../controller/productController");
const orderController = require("../controller/orderController");

const { isAdmin } = require("../middlewares/authMiddleware");

const multer = require("../middlewares/multer");

router.use(isAdmin, (req, res, next) => {
  if (req.isAuthenticated() && req.user.isAdmin) {
    res.locals.admin = req.user;
  }
  next();
});
router.get("/", adminController.getDashboard);

/**
 * Customer Management
 */

router.route("/users").get(adminController.getUsersList);

router.route("/users/toggle-block/:id").patch(adminController.toggleBlock);

/**
 * Category Management
 */

router.route("/category").get(categoryController.getAllCategory);

router
  .route("/category/add-category")
  .get(categoryController.getAddCategory)
  .post(categoryController.addCategory);

router
  .route("/category/edit-category/:id")
  .get(categoryController.getEditCategory)
  .post(categoryController.editCategory);

router
  .route("/category/delete-category")
  .get(categoryController.deleteCategory);

/**
 * Product Management
 */

router.route("/products").get(productController.getAllProducts);

router.route("/products/add-Product").get(productController.getAddProduct);

router
  .route("/products/add-product")
  .get(productController.getAddProduct)

  .post(multer.productImagesUpload, productController.addProduct);

router
  .route("/products/edit-product/:id")
  .get(productController.getEditProduct)
  .post(multer.productImagesUpload, productController.editProduct);

// list/unlist product

router.patch("/products/toggle-listing/:id", productController.toggleListing);

// Product Delete
router.delete("/products/delete-product/:id", productController.deleteProduct);



/**
 * Order Management
 */


router
.route("/orders").get(orderController.getOrders)
// router.route("/orders").get(orderController.getOrders);
// router.route("/orders/manage-order/:id").get(orderController.getOrderDetails);
// router
  // .route("/orders/manage-order/changeStatus/:id")
  // .post(orderController.changeOrderStatus);

module.exports = router;
