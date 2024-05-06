const express = require("express");
const router = express.Router();

const adminController = require("../controller/adminController");
const categoryController = require("../controller/categoryController");
const productController = require("../controller/productController");
const orderController = require("../controller/orderController");
const couponController = require("../controller/couponController");
const offerController = require("../controller/offerController");
const reportsController = require("../controller/reportsController");


const { isAdmin } = require("../middlewares/authMiddleware");

const multer = require("../middlewares/multer");

router.use(isAdmin, (req, res, next) => {
  if (req.isAuthenticated() && req.user.isAdmin) {
    res.locals.admin = req.user;
  }
  next();
});
router.get("/", adminController.getDashboard);

router.get("/chart", adminController.getChartData);


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


router.get('/orders', orderController.getOrders)


router.route("/orders/manage-order/:id").get(orderController.getOrderDetails);
router.route("/orders/manage-order/changeStatus/:id").post(orderController.changeOrderStatus);
router .route("/orders/manage-order/changeStatus/:id")
//  router .post(orderController.changeOrderStatus);




  /***
 * Coupon Management
 */

router.get('/coupons', couponController.getCoupons)

router.post('/coupons/add-coupon', couponController.addCoupon)
router
  .route("/coupons/edit/:id")
  .get(couponController.getCoupon)
  .put(couponController.editCoupon);

 
router.patch("/coupon/toggleStatus/:id", couponController.toggleStatus)



/**
 * Offer Management
 *  - Category Offer
 *  - Product Offer
 */


// Category Offer
router.get('/category-offers', offerController.getCategoryOffers)
 router.get('/category-details/:id', categoryController.getCategoryDetails)
 router.patch('/category-offer/:id', offerController.addCatOffer)
 router.patch('/toggle-active-category/:id', offerController.toggleActiveCatOffer)

// Product Offer
router.get('/product-offers', offerController.getProductOffers)
 router.get('/product-details/:id', productController.getProdDetails)
 router.patch('/product-offer/:id', offerController.addProdOffer)
 router.patch('/toggle-active-product/:id', offerController.toggleActiveProdOffer)



/**
 * Sales Report
 */

router.get('/sales-report', reportsController.getSalesReport)
router.get('/sales-report/excel', reportsController.salesReportExcel)
router.get('/sales-report/pdf-download', reportsController.getSalesReportPdf)



module.exports = router;
