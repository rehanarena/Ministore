const User = require("../model/userSchema");
const Product = require("../model/productSchema");
const bcrypt = require("bcrypt");
const mongoose = require("mongoose");


module.exports = {
    /**
     * User Profile Mangement
     */
    getProfile: async (req, res) => {
      const locals = {
        title: "ministore - Profile",
      };
  
      res.render("user/profile", {
        locals,
        user: req.user,
      });
    },
    editProfile: async (req, res) => {
      console.log(req.body);
      const user = await User.findById(req.user.id)
  
      const {firstName, lastName, phone} = req.body
  
      user.firstName = firstName
      user.lastName = lastName
      user.phone = phone
  
      await user.save()
    },
     // Password Reset From Profile
  resetPass: async (req, res) => {
    try {
      // console.log(req.body);
      const { oldPassword, newPassword, confirmNewPassword } = req.body;

      const user = await User.findById(req.user.id);
      if (user) {
        bcrypt.compare(
          oldPassword,
          user.password,
          async (err, validOldPass) => {
            if (validOldPass) {
              if (newPassword !== confirmNewPassword) {
                req.flash("error", "Passwords Do not Match");
                return res.redirect("/user/profile");
              } else {
                user.password = newPassword; // Assuming you have a method to hash the password
                await user.save();
                // return res.status(200).json({ 'success': 'Password Updated' });
                req.flash("success", "Password Updated");
                return res.redirect("/user/profile");
              }
            } else {
              // return res.status(401).json({ 'error': 'Old password is incorrect' });
              req.flash("error", "Old Password is incorrect");
              return res.redirect("/user/profile");
            }
          }
        );
      } else {
        // return res.status(404).json({ 'error': 'User not found' });
        req.flash("error", "User not found");
        return res.redirect("/user/profile");
      }
    } catch (error) {
      // return res.status(500).json({ 'error': 'Internal server error' });
      req.flash("error", "Internal server error");
      return res.redirect("/user/profile");
    }
  },
};