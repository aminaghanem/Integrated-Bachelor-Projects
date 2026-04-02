const Subject = require("../models/subjectModel.js")

// CREATE SUBJECT
exports.createSubject = async (req, res) => {
  try {

    req.body.name = req.body.name.trim().toLowerCase()
    const subject = await Subject.create(req.body)
    res.status(201).json(subject)
    
  } catch (err) {

    if (err.code === 11000) {
      return res.status(400).json({
        error: "Subject already exists"
      })
    }

    res.status(400).json({ error: err.message })
  }
}

// GET ALL SUBJECTS
exports.getAllSubjects = async (req, res) => {
  try {
    const subjects = await Subject.find()
    res.json(subjects)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

// GET SUBJECTS BY GRADE
exports.getSubjectsByGrade = async (req, res) => {
  try {
    const { grade } = req.params

    const subjects = await Subject.find({
      grade_levels: grade
    })

    res.json(subjects)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

exports.updateSubject = async (req, res) => {
  const updated = await Subject.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true }
  );
  res.json(updated);
};

// DELETE
exports.deleteSubject = async (req, res) => {
  await Subject.findByIdAndDelete(req.params.id);
  res.json({ message: "Deleted" });
};