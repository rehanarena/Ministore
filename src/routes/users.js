const express = require("express");
const router = express.Router();
const User = require("../model/userSchema");
const { isLoggedIn } = require("../middlewares/authMiddleware");
const userController = require("../controller/userController");

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
  .delete(userController.deleteAddress);

router
  .route("/address/delete-address/:id")
  .delete(userController.deleteAddress);






module.exports = router;