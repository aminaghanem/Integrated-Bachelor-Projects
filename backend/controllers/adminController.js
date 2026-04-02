const Admin = require("../models/adminModel");
const bcrypt = require("bcryptjs");

// CREATE ADMIN
exports.createAdmin = async (req, res) => {
  const { username, password } = req.body;

  const hash = await bcrypt.hash(password, 10);

  const admin = new Admin({
    username,
    password_hash: hash
  });

  await admin.save();
  res.status(201).json(admin);
};

// GET ALL ADMINS
exports.getAllAdmins = async (req, res) => {
  const admins = await Admin.find().select("-password_hash");
  res.json(admins);
};

// DELETE ADMIN
exports.deleteAdmin = async (req, res) => {
  await Admin.findByIdAndDelete(req.params.id);
  res.json({ message: "Deleted" });
};