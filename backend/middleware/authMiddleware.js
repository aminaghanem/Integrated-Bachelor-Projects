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

  try {

    const authHeader = req.headers.authorization

    console.log("Auth header:", authHeader)

    if (!authHeader) {
      return res.status(401).json({ error: "No token provided" })
    }

    if (!authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Invalid authorization format" })
    }

    const token = authHeader.split(" ")[1]

    console.log("Token:", token)

    const decoded = jwt.verify(token, process.env.JWT_SECRET)

    console.log("Decoded token:", decoded)

     if (!decoded.role || !modelMap[decoded.role]) {
      return res.status(401).json({ message: "Invalid token: missing or unknown role" })
    }

    const user = await modelMap[decoded.role].findById(decoded.id).select("-password")

    if (!user) {
      return res.status(401).json({ message: "User no longer exists" })
    }

    req.user = user          // the full document
    req.user.role = decoded.role  // attach role since it lives in JWT, not the DB doc

    next()

  } catch (error) {

    console.error("Auth middleware error:", error)

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