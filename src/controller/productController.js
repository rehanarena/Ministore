const layout = "./layouts/adminLayout.ejs";
const Product = require("../model/productSchema");
const Category = require("../model/categorySchema");
const sharp = require('sharp');


const fs = require("fs");
const path = require("path");


module.exports = {
  getAllProducts: async (req, res) => {
    let perPage = 9;
    let page = req.query.page || 1;

    const products = await Product.aggregate([{ $sort: { createdAt: -1 } }])
      .skip(perPage * page - perPage)
      .limit(perPage)
      .exec();

    console.log(products)
    const count = await Product.find().countDocuments()
    const nextPage = parseInt(page) + 1;
    const hasNextPage = nextPage <= Math.ceil(count / perPage);


    res.render("admin/products/products", {
      layout,
      products,
      current: page,
      pages: Math.ceil(count / perPage),
      nextPage: hasNextPage ? nextPage : null,
      currentRoute: "/user/products/",
    });
  },
  getAddProduct: async (req, res) => {
    const categories = await Category.find({ isActive: true });
    res.render("admin/products/addProduct", {
      layout,
      categories,
    });
  },
  getEditProduct: async (req, res) => {
    const product = await Product.findById(req.params.id);
    const categories = await Category.find({ isActive: true });
    res.render("admin/products/editProduct", {
      layout,
      product,
      categories,
    });
  },
  addProduct: async (req, res) => {
    console.log(req.body, req.files)
    try {
      let details = req.body;
      const files = await req.files;


      const img = [
        files.image1[0].filename,
        files.image2[0].filename,
        files.image3[0].filename,
        files.image4[0].filename,
      ];

      for (let i = 0; i < img.length; i++) {
        await sharp("./public/uploads/images/" + img[i])
          .resize(480, 480)
          .toFile("./public/uploads/cropped/" + img[i]);
      }

      console.log(details);
      const product = new Product({
        product_name: details.product_name,
        actualPrice: details.actualPrice,
        sellingPrice: details.sellingPrice,
        category: details.category,
        brand_name: details.brand_name,
        stock: details.stock,
        description: details.description,
        "images.image1": files.image1[0].filename,
        "images.image2": files.image2[0].filename,
        "images.image3": files.image3[0].filename,
        "images.image4": files.image4[0].filename,
      });

      const result = await product.save();

      if (result) {
        req.flash('success', 'The Product added Successfully');
        res.redirect("/admin/products");
      } else {
        req.flash('error', 'Something went wrong please try again!');
        res.redirect("/admin/addproduct");
      }
    } catch (error) {
      console.error(error); // Log the error for debugging
      res.status(400).send({ error: "An error occurred while adding the product." });
    }
  },

  editProduct: async (req, res) => {
    try {
      console.log(req.files, req.body);
      let details=req.body;
    let imagesFiles= req.files;
    let currentData= await getProductDetails(req.query.id);
  
    let img1,img2,img3,img4;

      img1 = imagesFiles.image1 ? imagesFiles.image1[0].filename : currentData.images.image1;
      img2 = imagesFiles.image2 ? imagesFiles.image2[0].filename : currentData.images.image2;
      img3 = imagesFiles.image3 ? imagesFiles.image3[0].filename : currentData.images.image3;
      img4 = imagesFiles.image4 ? imagesFiles.image4[0].filename : currentData.images.image4;

      const img = [
        imagesFiles.image1 ? imagesFiles.image1[0].filename : currentData.images.image1,
        imagesFiles.image2 ? imagesFiles.image2[0].filename : currentData.images.image2,
        imagesFiles.image3 ? imagesFiles.image3[0].filename : currentData.images.image3,
        imagesFiles.image4 ? imagesFiles.image4[0].filename : currentData.images.image4,
       ];
       
  
      for (let i = 0; i < img.length; i++) {
        await sharp("public/products/images/" + img[i])
          .resize(480, 480)
          .toFile("public/products/croped/" + img[i]);
      }

      const update= await Product.updateOne(
        {_id:req.query.id},
        {
          $set:{
            product_name:details.product_name,
            actualPrice:details.actualPrice,
            sellingPrice:details.sellingPrice,
            category:details.category,
            brand_name:details.brand_name,
            description:details.description,
            stock:details.stock,
            "images.image1": img1,
            "images.image2": img2,
            "images.image3": img3,
            "images.image4": img4
          }
        })
        
        if(update){
          req.flash('success','The Prodect successfully Updated');
        res.redirect('/admin/products')
        }else{
          req.flash('error','Something went wrong Please Try again!')
          res.redirect('/admin/products')
        }
  } catch (error) {
   console.log(error);
  }
},
  deleteProduct: async (req, res) => {
    console.log(req.body);
  },

  // List / Unlist - Products (Soft Delete)
  toggleListing: async (req, res) => {
    try {
      const product = await Product.findById(req.params.id);
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
      product.isActive = !product.isActive;
      await product.save();
      res.status(200).json({
        message: product.isActive
          ? "Product listed successfully"
          : "Product unlisted successfully",
      });
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  },
//delete product
  deleteProduct: async (req, res) => {
    console.log(req.params);

    try {
      const product = await Product.findById(req.params.id);
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }

      // Delete main image
      if (product.img1 && product.img1.path) {
        fs.unlink(
          path.join(__dirname, "..", product.img1.path),
          (err) => {
            if (err) console.error(err);
          }
        );
      }

      // Delete secondary images
      if (product.img2 && product.img2.length > 0) {
        product.img2.forEach((image) => {
          fs.unlink(path.join(__dirname, "..", image2.path), (err) => {
            if (err) console.error(err);
          });
        });
      }
      if (product.img2 && product.img2.length > 0) {
        product.img2.forEach((image) => {
          fs.unlink(path.join(__dirname, "..", image2.path), (err) => {
            if (err) console.error(err);
          });
        });
      }
      if (product.img3 && product.img3.length > 0) {
        product.img3.forEach((image) => {
          fs.unlink(path.join(__dirname, "..", image3.path), (err) => {
            if (err) console.error(err);
          });
        });
      }
      if (product.img4 && product.img3.length > 0) {
        product.img4.forEach((image) => {
          fs.unlink(path.join(__dirname, "..", image4.path), (err) => {
            if (err) console.error(err);
          });
        });
      }

      // Delete the product from the database
      await Product.deleteOne({ _id: req.params.id });
      res.status(200).json({ message: "Product deleted successfully" });
    } catch (error) {
      console.log(error);
      res.status(500).json({ message: "Server error" });
    }
  },
};