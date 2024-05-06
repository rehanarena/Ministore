const User = require("../model/userSchema");
const Product = require("../model/productSchema");
const Address = require("../model/addressSchema");
const Wallet = require("../model/walletSchema");
const Wishlist = require("../model/wishlistSchema");
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
    let wishlist = await Wishlist.findOne({userId: user._id}).populate({
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
    console.log(req.body, req.params);

    const productId = req.body.productId;

    try {
        // Find the product
        const product = await Product.findById(productId);
        if (!product) {
            console.log("Product not found");
            return res.status(404).json({ success: false, message: "Product not found" });
        }

        // Find the user
        const user = await User.findById(req.user.id);
        if (!user) {
            console.log("User not found");
            return res.status(404).json({ success: false, message: "User not found" });
        }

        // Check if user has a wishlist, if not, create one
        let wishlist = await Wishlist.findOne({userId: user._id})
        if(!wishlist){
          let items = []
          items.push(product._id)
          wishlist = new Wishlist({
            userId: user._id,
            products: items,
          })
          await wishlist.save()
          return res.status(200).json({
            success:true,
            message: 'Product added to Wishlist.'
          })
        }

        // Check if the product already exists in the wishlist
        const productExistInWishlist = wishlist.products.find(
          (item)=> item.toString() === product._id.toString()
        )
        if(productExistInWishlist){
          return res.status(400).json({
            success: false,
            message:'product already exists in the wishlist.'
          })
        }

        // Add the product to the wishlist
      wishlist.products.push(product._id)
      await wishlist.save()
      return res.status(200).json({
        success: true,
        message: 'product Added to Wishlist.'
      })
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: "An error occurred, server facing issues!",
        });
    }
},


  
removeFromWishlist: async (req, res) => {
  try {
    const { productId } = req.body;

    // Assuming User and WishList models are properly imported
    const user = await User.findById(req.user.id);
    const updatedWishList = await Wishlist.findOneAndUpdate(
      { userId: user._id },
      { $pull: { products: productId } },
      { new: true }
    );

    if (updatedWishList) {
      return res.status(201).json({
        success: true,
        message: "Removed item from wishlist",
      });
    } else {
      return res.status(500).json({
        success: false,
        message: "Failed to remove product from wishlist. Please try again.",
      });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Failed to remove product from wishlist. Please try again.",
    });
  }
},



  getWallet: async (req, res) => {
    const locals = {
      title: "Ministore - User Wallet",
    };


    

    let userWallet = await Wallet.findOne({ userId: req.user.id });

    if (userWallet) {
      userWallet.transactions.reverse();
    }

    if(!userWallet){
      userWallet = {
        balance: 0,
        transactions: [],
      }
    }

    console.log(userWallet);
    res.render("user/wallet", {
      locals,
      userWallet,
    });
  },
  addToWallet: async (req, res) => {
    try {
      const { amount, notes } = req.body;
      const id = crypto.randomBytes(8).toString("hex");
      const payment = await createRazorpayOrder(id, amount);

      const user = await User.findOne({ _id: req.user.id });

      if (!payment) {
        return res
          .status(500)
          .json({ success: false, message: "Failed to create payment" });
      }

      res.json({ success: true, payment, user });
    } catch (error) {
      const { message } = error;
      res.status(500).json({ success: false, message });
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
     title: "Ministore - User Refferals"
  }
 
  const user = await User.findOne({ _id: req.user.id });
 
  if(!user.referralCode){
     const refferalCode = generateRefferalCode(8);
 
     user.referralCode = refferalCode;
     await user.save();
  }
 
  console.log(user);
 
  // Ensure successfullRefferals is an array before reversing it
  let successfullRefferals = user.successfullRefferals || [];
  successfullRefferals = successfullRefferals.reverse();
 
  res.render("user/refferals", {
     locals,
     refferalCode: user.referralCode,
     successfullRefferals
  })
 },
 
};
