const Parent = require("../models/Parent");
const bcrypt = require("bcryptjs");

// Parent signup
const signup = async (req, res) => {
  const { firstName, lastName, email } = req.body;

  if (!firstName || !lastName || !email) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  try {
    const parent = await Parent.create({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.toLowerCase().trim(),
    });

    const responseParent = {
      id: parent._id,
      firstName: parent.firstName,
      lastName: parent.lastName,
      email: parent.email,
      createdAt: parent.createdAt,
    };

    res.status(201).json({
      message: "Parent account created successfully",
      parent: responseParent,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get parent by ID
const getParentById = async (req, res) => {
  try {
    const parent = await Parent.findById(req.params.parentId).select(
      "-password",
    );
    if (!parent) {
      return res.status(404).json({ message: "Parent not found" });
    }

    res.status(200).json(parent);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Find or create parent by email
const findOrCreateParent = async (req, res) => {
  const { firstName, lastName, email } = req.body;

  if (!email) {
    return res.status(400).json({ message: "Email is required" });
  }

  try {
    let parent = await Parent.findOne({ email: email.toLowerCase().trim() });

    if (!parent) {
      parent = await Parent.create({
        firstName: firstName ? firstName.trim() : "",
        lastName: lastName ? lastName.trim() : "",
        email: email.toLowerCase().trim(),
      });
    }

    res.status(200).json({ parentId: parent._id });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

module.exports = {
  signup,
  getParentById,
  findOrCreateParent,
};
