const express = require("express");
const router = express.Router();

const {
  createAdmin,
  getAllAdmins,
  deleteAdmin
} = require("../controllers/adminController");

const { protect, authorizeRoles } = require("../middleware/authMiddleware");

router.post("/", protect, authorizeRoles("admin"), createAdmin);

router.get("/", protect, authorizeRoles("admin"), getAllAdmins);

router.delete("/:id", protect, authorizeRoles("admin"), deleteAdmin);

module.exports = router;