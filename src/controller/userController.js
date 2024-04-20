const User = require("../model/userSchema");
const Product = require("../model/productSchema");
const Address = require("../model/addressSchema");
const WishList = require("../model/wishlistSchema");
const bcrypt = require("bcrypt");
const mongoose = require("mongoose");


function generateRefferalCode(length) {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let referralCode = '';
  for (let i = 0; i < length; i++) {
      referralCode += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return referralCode;
}


module.exports = {
    /**
     * User Profile Mangement
     */
    getProfile: async (req, res) => {
      const locals = {
        title: "ministore - Profile",
      };
  
      res.render("user/profile.ejs", {
        locals,
        user: req.user,
      });
    },
    editProfile: async (req, res) => {
        try {
          console.log(req.body);
          const user = await User.findById(req.user.id);
    
          const { firstName, lastName, phone } = req.body;
    
          user.firstName = firstName || user.firstName;
          user.lastName = lastName || user.lastName;
          user.phone = phone || user.phone;
    
          await user.save();
    
          return res.status(200).json({ message: "Profile updated successfully", user });
        } catch (error) {
          console.error("Error updating profile:", error);
          return res.status(500).json({ error: "Internal server error" });
        }
      },

      /***
   * User Wishlist Mangement
   */

  getWishlist: async (req, res) => {
    const locals = {
      title: "Ministore - Wishlist",
    };
    let user = await User.findById(req.user.id);
    let wishlist = await WishList.findById(user.wishlist).populate({
      path: "products",
     
    });
    // console.log(wishlist);
    let products;

    if (!wishlist) {
      products = [];
    } else {
      products = wishlist.products;
    }

    res.render("user/wishlist", {
      locals,
      wishlist,
      products,
    });
  },

  addToWishlist: async (req, res) => {
    console.log(req.body,req.params);
    try {
      const product_id = req.body.productId
      
    } catch (error) {
      
    }

  },
  removeFromWishlist: async (req, res) => {
    try {
      const { productId } = req.body;
      const user = await User.findById(req.user.id);

      const updatedWishList = await WishList.findByIdAndUpdate(user.wishlist, {
        $pull: { products: productId },
      });

      if (updatedWishList) {
        return res.status(201).json({
          success: true,
          message: "Removed item from wishlist",
        });
      } else {
        return res.status(500).json({
          success: true,
          message: "failed to remove product from wishlist try again",
        });
      }
    } catch (error) {
      return res.status(500).json({
        success: true,
        message: "failed to remove product from wishlist try again",
      });
    }
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
  /**
   * User Address Management
   */

  getAddress: async (req, res) => {
    const address = await Address.find({
      customer_id: req.user.id,
      delete: false,
    });

    // console.log(address);

    const locals = {
      title: "Ministore - Profile",
    };

    res.render("user/address", {
      locals,
      address,
      user: req.user,
    });
  },
  addAddress: async (req, res) => {
    // console.log(req.body);
    await Address.create(req.body);
    req.flash("success", "Address Addedd");
    res.redirect("/user/address");
  },
  getEditAddress: async (req, res) => {
    const addressId = req.params.id;

    try {
      const address = await Address.findOne({ _id: addressId });
      if (address) {
        res.status(200).json({ status: true, address });
      } else {
        // Send a  404 status code with a JSON object indicating the address was not found
        res.status(404).json({ status: false, message: "Address not found" });
      }
    } catch (error) {
      // Handle any errors that occurred during the database operation
      console.error(error);
      res.status(500).json({ status: false, message: "Internal server error" });
    }
  },
  editAddress: async (req, res) => {
    try {
      const addressId = req.params.id;
      const updatedAddress = req.body;

      // Assuming you have a model for addresses, e.g., Address
      const address = await Address.findByIdAndUpdate(
        addressId,
        updatedAddress,
        {
          new: true, // returns the new document if true
        }
      );

      if (!address) {
        return res
          .status(404)
          .send({ message: "Address not found with id " + addressId });
      }

      req.flash("success", "Address Edited");
      res.redirect("/user/address");
    } catch (error) {
      console.error(error);
      req.flash("error", "Error editing address. Please try again.");
      res.redirect("/user/address");
    }
  },

  deleteAddress: async (req, res) => {
    try {
        let id = req.params.id;
        const address = await Address.deleteOne({ _id: id });

        if (address.deletedCount === 1) {
            req.flash("success", "Address Deleted");
            return res.redirect("/user/address");
        } else {
            throw new Error("Failed to delete address");
        }
    } catch (error) {
        console.error("Error deleting address:", error);
        req.flash("error", "Failed to delete address");
        return res.redirect("/user/address");
    }
},
getRefferals: async(req, res) => {
  const locals = {
    title: "SoloStride - User Refferals"
  }

  const user = await User.findOne({ _id: req.user.id });

  if(!user.referralCode){
    const refferalCode = generateRefferalCode(8);

    user.referralCode = refferalCode;
    await user.save();
  }

  console.log(user);

  // successfullRefferals = user.successfullRefferals.reverse();

  res.render("user/refferals", {
    locals,
    refferalCode: user.referralCode,
    // successfullRefferals
  })
},
};
