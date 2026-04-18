const Student = require("../models/studentModel");

/**
 * Updates a student's interest_scores based on a single browsing activity.
 * Call this after saving a BrowserActivity document.
 */
async function updateInterestScores(studentId, { category, visit_duration, interaction_type }) {
  if (!category || category === "General") return;

  const student = await Student.findById(studentId);
  if (!student) return;

  // --- Calculate score delta ---
  let delta = 0;

  // Visit duration signals
  if (visit_duration > 120)      delta += 0.3;
  else if (visit_duration >= 30) delta += 0.1;
  else if (visit_duration < 10)  delta -= 0.1;

  // Interaction type signals
  if (interaction_type === "click")       delta += 0.1;
  else if (interaction_type === "scroll") delta += 0.15;

  // Revisit bonus: check if student visited this category before
  const alreadyExists = student.interests.interest_scores.find(
    i => i.category === category
  );
  if (alreadyExists && alreadyExists.score > 0) delta += 0.2;

  // --- Apply interest decay to ALL categories not updated in 2 weeks ---
  const twoWeeksAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  student.interests.interest_scores = student.interests.interest_scores.map(interest => {
    if (interest.category !== category && student.interests.last_updated < twoWeeksAgo) {
      return { ...interest.toObject(), score: Math.max(0, interest.score - 0.05) };
    }
    return interest;
  });

  // --- Upsert the target category ---
  const idx = student.interests.interest_scores.findIndex(i => i.category === category);
  if (idx >= 0) {
    student.interests.interest_scores[idx].score = Math.max(
      0,
      student.interests.interest_scores[idx].score + delta
    );
  } else {
    student.interests.interest_scores.push({
      category,
      score: Math.max(0, delta)
    });
  }

  student.interests.last_updated = new Date();
  await student.save();
}

module.exports = { updateInterestScores };