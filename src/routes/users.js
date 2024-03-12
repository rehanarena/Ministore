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





module.exports = router;