const Postcard = require("../models/Postcard");

// GET all postcards for a user
const getUserPostcards = async (req, res) => {
  try {
    const postcards = await Postcard.find({ userId: req.params.userId }).sort({
      createdAt: -1,
    });
    res.status(200).json(postcards);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// GET single postcard by id
const getPostcardById = async (req, res) => {
  try {
    const postcard = await Postcard.findById(req.params.id);
    if (!postcard)
      return res.status(404).json({ message: "Postcard not found" });
    res.status(200).json(postcard);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// POST create/save a new postcard
const createPostcard = async (req, res) => {
  const {
    userId,
    jsonLayout,
    elements,
    postcardText,
    backgroundName,
    imageUrl,
    emotionAnalysis,
  } = req.body;
  try {
    const postcard = await Postcard.create({
      userId,
      jsonLayout: jsonLayout || elements || [],
      postcardText: postcardText || "",
      backgroundName: backgroundName || "",
      imageUrl: imageUrl || null,
      emotionAnalysis: emotionAnalysis || { emotion: "", message: "" },
    });
    res.status(201).json(postcard);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// PUT update postcard (user edits their design)
const updatePostcard = async (req, res) => {
  try {
    const postcard = await Postcard.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    if (!postcard)
      return res.status(404).json({ message: "Postcard not found" });
    res.status(200).json(postcard);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// DELETE postcard
const deletePostcard = async (req, res) => {
  try {
    const postcard = await Postcard.findByIdAndDelete(req.params.id);
    if (!postcard)
      return res.status(404).json({ message: "Postcard not found" });
    res.status(200).json({ message: "Postcard deleted" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

module.exports = {
  getUserPostcards,
  getPostcardById,
  createPostcard,
  updatePostcard,
  deletePostcard,
};
