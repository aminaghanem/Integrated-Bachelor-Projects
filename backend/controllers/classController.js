const SchoolClass = require("../models/classModel");
const Teacher = require("../models/teacherModel");
const Student = require("../models/studentModel");
const Subject = require("../models/subjectModel");

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

      // 1. check subject exists
      const subjectDoc = await Subject.findById(subject.subject_id);
      if (!subjectDoc) {
        return res.status(400).json({
          message: `Subject not found`
        });
      }

      // 2. check teacher exists
      const teacher = await Teacher.findOne({
        username: subject.teacher_username
      });

      if (!teacher) {
        return res.status(400).json({
          message: `Teacher ${subject.teacher_username} not found`
        });
      }

      // 3. OPTIONAL (very good practice 🔥)
      // check teacher can teach this subject
      if (
        teacher.teachable_subjects &&
        !teacher.teachable_subjects.includes(subject.subject_id)
      ) {
        return res.status(400).json({
          message: `${teacher.username} cannot teach this subject`
        });
      }

      // 4. push correct structure
      resolvedSubjects.push({
        subject: subjectDoc._id,   // ✅ ObjectId
        teacher_id: teacher._id
      });
    }

    // resolve students
    const students = await Student.find({
      username: { $in: student_usernames }
    });

    const foundUsernames = students.map(s => s.username)

    const invalidUsernames = student_usernames.filter(
      u => !foundUsernames.includes(u)
    )

    if (invalidUsernames.length > 0) {
      return res.status(400).json({
        error: `Invalid usernames: ${invalidUsernames.join(", ")}`
      })
    }

    const alreadyAssigned = students.filter(s => s.class_id)

    if (alreadyAssigned.length > 0) {
      return res.status(400).json({
        error: ` ${alreadyAssigned
          .map(s => s.username)
          .join(", ")}
          are already assigned to a class`
      })
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
              subject: subject.subject
            }
          }
        }
      );

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
      .populate("subjects.subject")
      .populate("subjects.teacher_id")
      .populate("students.student_id");

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

    res.status(400).json({ message: 'cannot add' });

  }
};


module.exports = {
  createClass,
  getClassById,
  addStudentToClass
};