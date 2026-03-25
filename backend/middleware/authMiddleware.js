const jwt = require("jsonwebtoken")
const Student = require("../models/studentModel")
const Teacher = require("../models/teacherModel")
const Parent  = require("../models/parentModel")

const modelMap = {
  student: Student,
  teacher: Teacher,
  parent:  Parent,
}

const protect = async (req, res, next) => {
let token

  if (req.headers.authorization?.startsWith("Bearer")) {
    token = req.headers.authorization.split(" ")[1]
  }

  if (!token) {
    return res.status(401).json({ error: "Not authorized" })
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    req.user = decoded
    next()
  } catch (err) {
    res.status(401).json({ error: "Invalid token" })
  }
};

const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Access denied" })
    }
    next()
  }
};

module.exports =  { protect, authorizeRoles };