const Coupon = require("../model/couponSchema");
const layout = "./layouts/adminLayout";
module.exports = {
  getCoupons: async (req, res) => {
    let search = "";
    if(req.query.search){
      search = req.query.search
    }
    let perPage = 9;
    let page = req.query.page || 1;


    searchQuery = {}
    if(search){
      searchQuery = {
        $or: [
          { code: { $regex: search, $options: "i"} },
          { description: { $regex: search, $options: 'i'}},
        ],
      }
    }

    const coupons = await Coupon.find(searchQuery)
      .skip(perPage * page - perPage)
      .limit(perPage)
      .sort({createdAt: -1})
      .exec();

    const count = await Coupon.find().countDocuments();
    const nextPage = parseInt(page) + 1;
    const hasNextPage = nextPage <= Math.ceil(count / perPage);

    res.render("admin/coupons/coupons.ejs", {
      coupons,
      layout,
      current: page,
      pages: Math.ceil(count / perPage),
      nextPage: hasNextPage ? nextPage : null,
      currentRoute: "/admin/coupons/",
      search,
    });
  },
  getCoupon: async (req, res) => {
    let id = req.params.id;
    try {
      const coupon = await Coupon.findById(id);
      if (coupon) {
        res.status(200).json(coupon);
      } else {
        res.status(404).json({ error: "Coupon not found" });
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch coupon" });
    }
  },
  addCoupon: async (req, res) => {
    console.log(req.body);
    try {
      let {
        code,
        description,
        rateOfDiscount,
        minPurchaseAmount,
        expirationDate,
      } = req.body;

      if(!code || !description || !minPurchaseAmount || !expirationDate){
        return res.status(400).json({
          success: false,
          message: "All fiels are required.",
        });
      }
      if(rateOfDiscount <= 0 || rateOfDiscount > 95){
        return res.status(400).json({
          success: false,
          message: "Rate of discount should be between 1 and 95.",
        })
      }

      if(minPurchaseAmount <= 0 ){
        return res.status(400).json({
          success: false,
          message: "Minimum purchase amount should be greater than 0.",
        })
      }

      if(expirationDate <= Date.now() ){
        return res.status(400).json({
          success: false,
          message: "Coupon has expired.",
        })
      }

      minPurchaseAmount = Number(minPurchaseAmount);
      rateOfDiscount = Number(rateOfDiscount);

      expirationDate = new Date(expirationDate);
      code = code.trim().toLowerCase();

      // Check if the coupon code already exists
      const couponExists = await Coupon.exists({ code });
      if (couponExists) {
        return res.status(400).json({
          success: false,
          message:
            "A coupon with this code already exists. Please use a different code.",
        });
      }

      let coupon = new Coupon({
        code,
        description,
        minPurchaseAmount,
        rateOfDiscount,
        isActive: true,
        expirationDate,
      });

      let savedData = await coupon.save();
      console.log(savedData);
      if (savedData instanceof Coupon) {
        return res
          .status(201)
          .json({ success: true, message: "New coupon created!" });
      }

      throw new Error("Failed to add new coupon due to server issues.");
    } catch (error) {
      console.log(error);
      // Check if the error is a Mongoose validation error
      if (error.name === "ValidationError") {
        return res.status(400).json({
          success: false,
          message: error.message, // This will contain the specific validation error messages
        });
      }

      return res.status(500).json({
        success: false,
        message: "Failed to add new coupon due to server issues.",
      });
    }
  },
  editCoupon: async (req, res) => {
    try {
      console.log(req.body);
      const id = req.params.id;
      let {
        code,
        description,
        minPurchaseAmount,
        rateOfDiscount,
        expirationDate,
        isActive,
      } = req.body;

      minPurchaseAmount = Number(minPurchaseAmount);
      rateOfDiscount = Number(rateOfDiscount);

      expirationDate = new Date(expirationDate);
      code = code.trim().toLowerCase();

      isActive = isActive === "true" ? true : false;

      // Validate the input fields
      if (
        !code ||
        !description ||
        !minPurchaseAmount ||
        !description ||
        !rateOfDiscount ||
        !expirationDate ||
        !isActive
      ) {
        return res.status(400).json({
          success: false,
          message:
            "All fields are mandatory. Rate of discount and maximum discount should be above zero. Try Again!",
        });
      } else if (
        isNaN(rateOfDiscount) ||
        isNaN(minPurchaseAmount) ||
        rateOfDiscount <= 0
       
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Rate of discount and maximum discount value should be non-negative numerical values. Try Again!",
        });
      }

      // Update the coupon document
      const update = {
        code,
        description,
        minPurchaseAmount,
        rateOfDiscount,
        isActive,
        expirationDate,
      };

      const opts = { runValidators: true, new: true }; // runValidators ensures schema validation is applied

      console.log(req.params);
      const updatedCoupon = await Coupon.findOneAndUpdate(
        { _id: req.params.id },
        update,
        opts
      );

      console.log(updatedCoupon);
      if (updatedCoupon) {
        req.flash("success", "Coupon updated successfully!");
        return res.redirect("/admin/coupons");
        // return res.status(200).json({
        //     success: true,
        //     message: "Coupon updated successfully!",
        //     coupon: updatedCoupon,
        // });
      } else {
        req.flash("error", "Coupon not found!");
        return res
          .status(404)
          .json({ success: false, message: "Coupon not found!" });
      }
    } catch (error) {
      console.log(error);
      // Handle validation errors
      if (error.name === "ValidationError") {
        return res.status(400).json({
          success: false,
          message: error.message, // This will contain the specific validation error messages
        });
      }

      return res.status(500).json({
        success: false,
        message: "Failed to update coupon due to server issues.",
      });
    }
  },
  toggleStatus: async (req, res) => {
    let id = req.params.id;
    try {
      const coupon = await Coupon.findById(id);
      console.log(coupon);
      if (coupon) {
        coupon.isActive = !coupon.isActive; // Toggle the listing status
        await coupon.save();
        let status = coupon.isActive ? "Activated" : "Dectivated";
        res.status(200).json({
          coupon: coupon,
          message: `The Coupon : ${coupon.code.toUpperCase()} is ${status}`,
        });
      } else {
        res.status(404).json({ error: "Size not found" });
      }
    } catch (error) {
      console.log(error);
      res.status(500).json({ error: "Failed to toggle listing status" });
    }
  },
  /***
   * User Side
   *  - apply
   *  - remove
   *  - get all coupons
   */

  applyCoupon: async (req, res) => {
    console.log(req.body);
    try {
        let { code } = req.body;
        code = code.trim().toUpperCase(); // Normalize coupon code to uppercase

        const couponCode = await Coupon.findOne({ code });

        if (!couponCode) {
            return res.status(404).json({ success: false, message: "Coupon not found." });
        }

        // Check if the coupon is expired, inactive, or already used by the user
        // Handle expiration date, activity status, and user usage here...

        const userCart = await Cart.findOne({ userId: req.user.id });
        if (!userCart) {
            return res.status(404).json({ success: false, message: "User cart not found." });
        }

        // Check if the coupon is already applied
        if (userCart.coupon && userCart.coupon.toString() === couponCode._id.toString()) {
            return res.status(400).json({ success: false, message: "Coupon is already in use." });
        }

        // Apply the coupon to the user's cart
        // Calculate discount amount, update user cart, and save changes

        return res.status(200).json({
            success: true,
            message: "Coupon is valid and applied!",
            coupon: couponCode,
            discountAmount,
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ success: false, message: "An error occurred." });
    }
},

removeCoupon: async (req, res) => {
    try {
        const cart = await Cart.findOne({ userId: req.user.id });
        if (!cart) {
            return res.status(404).json({ message: "Cart not found" });
        }

        // Remove the applied coupon from the user's cart
        cart.coupon = undefined;
        cart.couponDiscount = 0;
        await cart.save();

        return res.status(200).json({ message: "Coupon removed successfully" });
    } catch (error) {
        console.error("Error removing coupon:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
},

  removeCoupon: async (req, res) => {
    try {
      // Check if the cart exists and the user is associated with it
      const cart = await userCart.findOne({ userId: req.user.id });

      console.log(cart);
      if (!cart) {
        return res.status(404).json({ message: "Cart not found" });
      }

      // Set coupon to undefined
      cart.coupon = undefined;
      cart.couponDiscount = 0; // Reset the coupon discount to 0

      await cart.save();
      return res.status(200).json({ message: "Coupon removed successfully" });
    } catch (error) {
      console.error("Error removing coupon:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  },
};
