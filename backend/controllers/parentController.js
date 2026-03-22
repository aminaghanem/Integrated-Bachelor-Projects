const Parent = require("../models/parentModel.js");
const bcrypt = require("bcryptjs");

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

module.exports = { createParent, getParents };