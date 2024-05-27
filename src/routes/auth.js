const express = require("express");
const router = express.Router();
const authController = require("../controller/authController");

const {
  isLoggedOut,
  isAdminLoggedOut,
} = require("../middlewares/authMiddleware");

router
  .route("/login")
  .get(isLoggedOut, authController.getLogin)
  .post(authController.userLogin);

router
  .route("/register")
  .get(isLoggedOut, authController.getRegister)
  .post(authController.userRegister);

router
  .route("/verify-otp")
  .get(isLoggedOut, authController.getVerifyOtp)
  .post(authController.verifyOtp);

router
  .route("/forgotPassword/verify-otp")
  .get(isLoggedOut, authController.getForgotPassOtp);

router.route("/resend-otp").get(authController.resendOTP);

router
  .route("/forgotPassword")
  .get(isLoggedOut, authController.getForgotPass)
  .post(authController.forgotPass);

router
  .route("/reset-password")
  .get(isLoggedOut, authController.getResetPass)
  .post(authController.resetPass);

//admin login
router
  .route("/admin/login")
  .get(isAdminLoggedOut, authController.getAdminLogin)
  .post(authController.adminLogin);

router
  .route("/admin/register")
  .get(authController.getAdminRegister)
  .post(authController.adminRegister);

//logout
router.get("/logout", authController.userLogout);
router.get("/admin/logout", authController.adminLogout);

module.exports = router;
