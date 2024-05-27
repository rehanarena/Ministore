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
      return res.render("shop/ProductList", {
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
  getContact: async (req, res) => {
    const locals = {
      title: "Ministore - Contact Us",
    };
    res.render("contact", {
      locals,
    });
  },

  getAbout: async (req, res) => {
    const locals = {
      title: "Ministore - About Us",
    };
    res.render("about", {
      locals,
    });
  },

  getProductDetails: async (req, res) => {
    const locals = {
      title: "Ministore - Product",
    };
    const productId = req.params.id;
    try {
      const pipeline = [
        { $match: { _id: new mongoose.Types.ObjectId(productId) } },
        {
          $lookup: {
            from: "categories",
            localField: "category",
            foreignField: "_id",
            as: "category",
          },
        },
        { $unwind: "$category" },
        {
          $project: {
            product_name: 1,
            category: "$category",
            description: 1,
            details: 1,
            price: 1,
            actualPrice: 1,
            sellingPrice: 1,
            onSale: 1,
            reviews: 1,
            onOffer: 1,
            offerDiscountPrice: 1,
            offerDiscountRate: 1,
            isActive: 1,
            images: 1 // Include images in the projection
          },
        },
      ];
  
      // Execute the aggregation pipeline
      const productData = await Product.aggregate(pipeline);
  
      // Check if product data was found
      if (!productData || productData.length === 0) {
        return res.status(404).json({ message: "Product not found" });
      }
  
      // Check product stock and set outOfStock flag
      productData.forEach((product) => {
        product.outOfStock = product.stock === 0;
      });
  
      console.log(productData);
  
      // Find related products
      const relatedProducts = await Product.find({
        category: productData[0].category._id,
        isActive: true,
      }).limit(4);
  
      // Render the EJS template with the product data
      res.render("shop/ProductDetails.ejs", {
        product: productData[0],
        related: relatedProducts,
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