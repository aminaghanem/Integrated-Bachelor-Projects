const SchoolClass = require("../models/classModel");
const Teacher = require("../models/teacherModel");
const Student = require("../models/studentModel");


// Create a new class
const createClass = async (req, res) => {

  try {

    const {
      school_name,
      grade_level,
      class_name,
      subjects,
      student_usernames
    } = req.body;

    // check class duplicate
    const existingClass = await SchoolClass.findOne({
      school_name,
      grade_level,
      class_name
    });

    if (existingClass) {
      return res.status(400).json({
        message: "Class already exists for this school and grade"
      });
    }

    // resolve teachers
    const resolvedSubjects = [];

    for (let subject of subjects) {

      const teacher = await Teacher.findOne({
        username: subject.teacher_username
      });

      if (!teacher) {
        return res.status(400).json({
          message: `Teacher ${subject.teacher_username} not found`
        });
      }

      resolvedSubjects.push({
        subject_name: subject.subject_name,
        teacher_id: teacher._id
      });

    }

    // resolve students
    const students = await Student.find({
      username: { $in: student_usernames }
    });

    if (students.length !== student_usernames.length) {
      return res.status(400).json({
        message: "One or more student usernames are invalid"
      });
    }

    const studentIds = students.map(s => s._id);

    const newClass = new SchoolClass({
      school_name,
      grade_level,
      class_name,
      subjects: resolvedSubjects,
      students: studentIds
    });

    await Student.updateMany(
      { _id: { $in: studentIds } },
      { class_id: newClass._id }
    );

    const teacherIds = resolvedSubjects.map(s => s.teacher_id);

    await Student.updateMany(
      { _id: { $in: studentIds } },
      { $addToSet: { teacher_ids: { $each: teacherIds } } }
    );

    for (let subject of resolvedSubjects) {

      await Teacher.findByIdAndUpdate(
        subject.teacher_id,
        {
          $addToSet: {
            teaching_assignments: {
              class_id: newClass._id,
              subject_name: subject.subject_name
            }
          }
        }
      )

    }

    await newClass.save();

    res.status(201).json({
      message: "Class created successfully",
      class: newClass
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      message: "Server error"
    });

  }
};


// Get single class
const getClassById = async (req, res) => {

  try {

    const schoolClass = await SchoolClass.findById(req.params.id)
      .populate("subjects.teacher_id")
      .populate("students");

    if (!schoolClass) {
      return res.status(404).json({ error: "Class not found" });
    }

    res.json(schoolClass);

  } catch (error) {

    res.status(500).json({ error: error.message });

  }
};


// Add student to class
const addStudentToClass = async (req, res) => {

  try {

    const { studentId } = req.body;

    const schoolClass = await SchoolClass.findById(req.params.id);

    if (!schoolClass) {
      return res.status(404).json({ error: "Class not found" });
    }

    schoolClass.students.push(studentId);

    schoolClass.number_of_students = schoolClass.students.length;

    await schoolClass.save();

    res.json(schoolClass);

  } catch (error) {

    res.status(400).json({ error: error.message });

  }
};


module.exports = {
  createClass,
  getClassById,
  addStudentToClass
};