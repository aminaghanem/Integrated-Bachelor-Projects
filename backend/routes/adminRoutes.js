const express = require("express");
const router = express.Router();

const {
  createAdmin,
  getAllAdmins,
  deleteAdmin
} = require("../controllers/adminController");

router.post("/", createAdmin);

router.get("/", getAllAdmins);

router.delete("/:id", deleteAdmin);

module.exports = router;