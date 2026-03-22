const express = require("express");
const router = express.Router();

const {
  createParent,
  getParents
} = require("../controllers/parentController");

const { protect, authorizeRoles } = require("../middleware/authMiddleware");

// Create parent (public registration)
router.post("/", createParent);

// Get all parents (teachers only)
router.get(
  "/",
  protect,
  authorizeRoles("teacher"),
  getParents
);

module.exports = router;