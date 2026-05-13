const express = require("express");
const router = express.Router();
const {
  getCategoriesByCountry,
  getCategoriesByType,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
} = require("../controllers/categoryController");

router.get("/country/:countryName", getCategoriesByCountry);
router.get("/country/:countryName/type/:type", getCategoriesByType);
router.get("/:id", getCategoryById);
router.post("/", createCategory);
router.put("/:id", updateCategory);
router.delete("/:id", deleteCategory);

module.exports = router;
