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
  getCategoryDetails: async (req, res) => {
    const categoryId = req.params.id
    try {
      const category = await Category.findOne({_id: categoryId});
      
      if (!category) {
        return res.status(404).json({ error: "Category not found" });
      }

      return res.status(200).json({
        success: true,
        category
      });
    } catch (error) {
      console.log("Error:", error);
      return res.status(500).json({ error: "Internal Server Error" });
    }
    
  },
  getAddCategory: async (req, res) => {
    res.render("admin/categories/addCategory", {
      layout,
    });
  },
  getEditCategory: async (req, res) => {
    const category = await Category.findById(req.params.id);
    console.log(category);
    res.render("admin/categories/editCategory", {
      category,
      layout,
    });
  },
  addCategory: async (req, res) => {
    console.log(req.body, "reqbody");
    const name = String(req.body.category).toLowerCase()
    const category = await Category.findOne({ name: name });
    if (category) {
      return res.json({ 'error': "Category Already Exist!!" })
    } else {

      // console.log(req.body);
      const newCategory = new Category({
        name: name,
      });
      const addCategory = newCategory.save();
      if (addCategory) {
        res.json({
          success: true,
        });
      }
    }
  },
  editCategory: async (req, res) => {
    try {
      const { status, category } = req.body;
      console.log(req.body);
      const id = req.params.id

      const edit = await Category.findById(id)

      edit.name = category.toLowerCase() || edit.name
      edit.isActive=!edit.isActive

      const update_category = await edit.save()
      if (update_category) {
        res.json({
          success: true,
        })
      }
    }
    catch (error) {
      console.log(error.message)
    }
  },
  deleteCategory: async (req, res) => {
    const id = req.query.id;

    // deleteing category from db
    const deleteCategory = await Category.findByIdAndDelete({ _id: id });
    if (deleteCategory) {
      res.json({
        success: true,
      });
    }
  },
};