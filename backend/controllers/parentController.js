const Parent = require("../models/parentModel.js");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const createParent = async (req, res) => {
  try {
    const { password, ...rest } = req.body;

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    const parent = await Parent.create({
      ...rest,
      password_hash
    });

    res.status(201).json(parent);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const getParents = async (req, res) => {
  const parents = await Parent.find().populate("children_ids");
  res.json(parents);
};

const getParentProfile = async (req, res) => {
  try {
    const parent = await Parent.findById(req.user.id)
      .populate({
        path: "children_ids",
        model: "Student",
        select: "username full_name grade_level date_of_birth preferred_language class_id interests proficiency_levels accessibility",
        populate: {
          path: "class_id",
          select: "class_name school_name grade_level"
        }
      })

    if (!parent) return res.status(404).json({ error: "Parent not found" })
    res.json(parent)
  } catch (err) {
    res.status(500).json({ error: "Server error" })
  }
}

const updateParent = async (req, res) => {
  try {
    const parent = await Parent.findByIdAndUpdate(req.params.id, req.body, { returnDocument: 'after' })
    if (!parent) return res.status(404).json({ error: "Parent not found" })
    res.json(parent)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

module.exports = { createParent, getParents, getParentProfile, updateParent };