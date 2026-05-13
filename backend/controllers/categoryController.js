const Category = require("../models/Category");

// GET all categories for a country
const getCategoriesByCountry = async (req, res) => {
  try {
    const categories = await Category.find({
      countryName: new RegExp(`^${req.params.countryName}$`, "i"),
    });
    res.status(200).json(categories);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// GET categories for a country filtered by type (food/landmark/festival)
const getCategoriesByType = async (req, res) => {
  try {
    const { countryName, type } = req.params;
    const categories = await Category.find({
      countryName: new RegExp(`^${countryName}$`, "i"),
      type,
    });
    res.status(200).json(categories);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// GET single category by id
const getCategoryById = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category)
      return res.status(404).json({ message: "Category not found" });
    res.status(200).json(category);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// POST create category (admin/seed use)
const createCategory = async (req, res) => {
  const { countryName, type, name, description, imageUrl, funFacts } = req.body;
  try {
    const category = await Category.create({
      countryName,
      type,
      name,
      description,
      imageUrl,
      funFacts: funFacts || [],
    });
    res.status(201).json(category);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// PUT update category
const updateCategory = async (req, res) => {
  try {
    const category = await Category.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    if (!category)
      return res.status(404).json({ message: "Category not found" });
    res.status(200).json(category);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// DELETE category
const deleteCategory = async (req, res) => {
  try {
    const category = await Category.findByIdAndDelete(req.params.id);
    if (!category)
      return res.status(404).json({ message: "Category not found" });
    res.status(200).json({ message: "Category deleted" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

module.exports = {
  getCategoriesByCountry,
  getCategoriesByType,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
};
