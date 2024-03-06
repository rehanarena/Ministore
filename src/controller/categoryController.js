

const layout = "./layouts/adminLayout.ejs";
const Category = require("../model/categorySchema");

module.exports = {
  getAllCategory: async (req, res) => {
    const locals = {
      title: "Category Management",
    };
    const categories = await Category.find();
    res.render("admin/categories/categories", {
      locals,
      categories,
      layout,
    });
  },
  getAddCategory: async (req, res) => {
    res.render("admin/categories/addCategory", {
      layout,
    });
  },
  getEditCategory: async (req, res) => {
    const category = await Category.findById(req.params.id);
    res.render("admin/categories/editCategory", {
      category,
      layout,
    });
  },
  addCategory: async (req, res) => {
    console.log(req.body);
    const name = String(req.body.category_name).toLowerCase()
    const category = await Category.findOne({ name: name });
    if (category) {
      req.flash("error", "Category already exists!!!")
      return res.redirect("admin/category");
    } else {
      req.flash("success", "Category Successfully Recorded");
      return res.redirect("admin/category");
    }
  },
  editCategory: async (req, res) => {
    try {
      const { status } = req.body;

      console.log(req.body);
    let name = req.body.name.toLowerCase()
    let editCategory = {
      name: name,
      isActive: status === "true" ? true : false,
    };
    
    // update banner details
    const id = req.params.id;
    const update_category = await Category.findByIdAndUpdate(
      { _id: id },
      editCategory,
      { new: true }
    );

    if (update_category) {
      res.json({
        success: true,
      });
    }
    } catch (error) {
      console.error(error.message); 
    }
  },
  deleteCategory: async (req, res) => {
    const id = req.query.id;
    const deleteCategory = await Category.findByIdAndDelete({ _id: id });
    if (deleteCategory) {
      res.json({
        success: true,
      });
    }
  },
};