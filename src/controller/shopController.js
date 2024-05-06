const mongoose = require("mongoose");
const Product = require("../model/productSchema");
const Category = require("../model/categorySchema");
const User = require("../model/userSchema");
const order = require("../model/orderSchema");






module.exports = {


  
  search: async (req, res, next) => {
    try {
      console.log(req.query);
      let search = "";

      if (req.query.search) {
        search = req.query.search.trim();
      }

      let page = 1;

      if (req.query.page) {
        page = req.query.page;
      }

      const categoryID = req.query.category;
      
      const limit = 9;

      const sortBy = req.query.sortBy;

      let sortQuery = {};

      if (sortBy) {
        if (sortBy === "lowPrice") {
          sortQuery = { sellingPrice: 1 };
        } else if (sortBy === "highPrice") {
          sortQuery = { sellingPrice: -1 };
        }
      }

      let filterQuery = {};

      if (search) {
        filterQuery.product_name = { $regex: search, $options: "i" };
      }

      if (categoryID) {
        filterQuery.category = categoryID;
      }
      
     

      const products = await Product.find(filterQuery)
        .sort(sortQuery)
        .skip((page - 1) * limit)
        .limit(limit * 1)
        .exec();

      const count = await Product.find(filterQuery).countDocuments();

      const categories = await Category.find({isActive: true});
      return res.render("shop/productList", {
        sortBy,
        categoryID,
        products,
        categories,
        count,
        pages: Math.ceil(count / limit),
        current: page,
        previous: page - 1,
        nextPage: Number(page) + 1,
        limit,
        search,
      });
    } catch (err) {
      console.log(err);
      next(err);
    }
  },
  getProductDetails: async (req, res) => {
    const locals = {
        title: "Ministore - Product",
    };
    
    try {
        // Fetch one product from the database
        const product = await Product.findOne({ isActive: true }).select('-_id product_name brand_name category description images price stock actualPrice sellingPrice onSale'); // Assuming all fields needed
        
        if (!product) {
            throw new Error('No product found');
        }
        
        // Fetch categories (if needed)
        const categories = await Category.find({ isActive: true });
        
        // Render the EJS template with the product data
        res.render("shop/ProductDetails.ejs", {
            locals,
            product,
            categories
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('Internal Server Error');
    }
},

getOrderSuccess: async (req, res) => {
  const locals = {
    title: "ministore - order-Success",
  };
   try {
    
    res.render("shop/orderConfirm", {
      locals,
      user: req.user,
      });
   } catch (error) {
    console.error('Error:', error);
        res.status(500).send('Internal Server Error');
    }
   },
}