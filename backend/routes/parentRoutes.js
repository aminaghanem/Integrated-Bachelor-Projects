const express = require("express");
const router = express.Router();

const {
  createParent,
  getParents,
  getParentProfile,
  updateParent
} = require("../controllers/parentController");

const { protect, authorizeRoles } = require("../middleware/authMiddleware");
const Student = require("../models/studentModel")
const BrowserActivity = require("../models/browserActivityModel")
const Parent = require("../models/parentModel")

// Create parent (public registration)
router.post("/", protect, authorizeRoles("admin"), createParent);

router.get("/", protect, authorizeRoles("admin"), getParents);

router.get("/profile", protect, authorizeRoles("parent", "admin"), getParentProfile)

router.get(
  "/children/:childId/activity",
  protect,
  authorizeRoles("parent", "admin"),
  async (req, res) => {
    try {
      // verify this child belongs to this parent
      const parent = await Parent.findById(req.user.id)
      const isOwned = parent.children_ids.map(id => id.toString()).includes(req.params.childId)
      if (!isOwned) return res.status(403).json({ error: "Access denied" })

      const activity = await BrowserActivity.find({ student_id: req.params.childId })
        .sort({ timestamp: -1 })
        .limit(100)

      res.json(activity)
    } catch (err) {
      res.status(500).json({ error: err.message })
    }
  }
)

router.put("/:id", protect, authorizeRoles("admin"), updateParent)

// GET students with no parent of a given relationship type
router.get("/available-students/:relationship", protect, authorizeRoles("admin"), async (req, res) => {
  try {

    // find all student IDs already linked to a parent of this relationship
    const parents = await Parent.find({ relationship_type: req.params.relationship })
    const linkedIds = parents.flatMap(p => p.children_ids.map(id => id.toString()))

    const available = await Student.find({ _id: { $nin: linkedIds } }).select("_id username full_name grade_level")
    res.json(available)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.put("/:id/children", protect, authorizeRoles("admin"), async (req, res) => {
  const parent = await Parent.findByIdAndUpdate(
    req.params.id,
    { $addToSet: { children_ids: req.body.student_id } },
    { returnDocument: 'after' }
  ).populate("children_ids", "username full_name")
  res.json(parent)
})

router.delete("/:id/children/:childId", protect, authorizeRoles("admin"), async (req, res) => {
  const parent = await Parent.findByIdAndUpdate(
    req.params.id,
    { $pull: { children_ids: req.params.childId } },
    { returnDocument: 'after'}
  )
  res.json(parent)
})

module.exports = router;