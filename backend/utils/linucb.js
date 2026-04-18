const math = require("mathjs");

const FEATURE_DIM = 10; // must match buildContextVector output length
const ALPHA = 0.3;      // exploration parameter — lower = more exploitation

/**
 * Builds the student context vector x (length = FEATURE_DIM).
 * This is the core of what "context" means in contextual bandit.
 */
function buildContextVector(student) {
  const regionMap = { "Egypt": 0.1, "USA": 0.2, "UK": 0.3, "Germany": 0.4 };
  const schoolMap = { "public": 0, "private": 0.5, "international": 1 };
  const langMap   = { "Arabic": 0.1, "English": 0.9, "German": 0.5 };
  const prefMap   = { "Visual": 0, "Auditory": 0.33, "Reading/Writing": 0.66, "Kinesthetic": 1 };

  // Get top 3 interest scores (sorted by score descending)
  const topInterests = [...(student.interests?.interest_scores ?? [])]
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(i => Math.min(i.score / 10, 1)); // normalize to 0–1

  while (topInterests.length < 3) topInterests.push(0); // pad to length 3

  // Average proficiency (0=beginner, 0.5=advanced, 1=expert)
  const profMap = { beginner: 0, advanced: 0.5, expert: 1 };
  const profScores = (student.proficiency_levels ?? []).map(p => profMap[p.level] ?? 0);
  const avgProf = profScores.length > 0
    ? profScores.reduce((a, b) => a + b, 0) / profScores.length
    : 0;

  const age = student.date_of_birth
    ? Math.min((new Date() - new Date(student.date_of_birth)) / (365.25 * 24 * 3600 * 1000), 25) / 25
    : 0.5;

  const gradeLevel = student.class_id?.grade_level
    ? Math.min(student.class_id.grade_level, 12) / 12
    : 0.5;

  return [
    age,                                                          // [0]
    gradeLevel,                                                   // [1]
    regionMap[student.context?.region] ?? 0.5,                   // [2]
    schoolMap[student.context?.school_type] ?? 0.5,              // [3]
    langMap[student.preferred_language] ?? 0.5,                  // [4]
    prefMap[student.learning_preferences] ?? 0.5,                // [5]
    avgProf,                                                      // [6]
    topInterests[0],                                             // [7]
    topInterests[1],                                             // [8]
    topInterests[2],                                             // [9]
  ];
  // Total: 10 features = FEATURE_DIM
}

/**
 * Selects the best arm (URL) given student context + cosine similarity scores.
 * 
 * @param {Array} arms - array of { url, category, embedding, cosineScore }
 * @param {Array} contextVector - from buildContextVector()
 * @param {Object} armStates - persisted A/b matrices per URL (from DB)
 * @returns {Object} the selected arm
 */
function selectArm(arms, contextVector, armStates) {
  const x = math.matrix(contextVector);
  let bestScore = -Infinity;
  let bestArm = arms[0];

  for (const arm of arms) {
    // Guard: same null check here
    const rawState = armStates[arm.url];
    const state = (rawState && rawState.A && rawState.b) ? rawState : initArmState();
    
    const A = math.matrix(state.A);
    const b = math.matrix(state.b);

    const Ainv = math.inv(A);
    const theta = math.multiply(Ainv, b);
    const exploit = math.dot(theta, x);
    const explore = ALPHA * Math.sqrt(math.dot(x, math.multiply(Ainv, x)));
    const finalScore = 0.6 * (exploit + explore) + 0.4 * (arm.cosineScore || 0);

    if (finalScore > bestScore) {
      bestScore = finalScore;
      bestArm = arm;
    }
  }

  return bestArm;
}

/**
 * Updates A and b matrices after observing a reward.
 * Call this when student completes/interacts with a recommended URL.
 * 
 * @param {Object} state - current { A, b } for this arm
 * @param {Array} contextVector - same vector used during selection
 * @param {number} reward - 0.0 to 1.0 (see rewardFromFeedback)
 * @returns {Object} updated { A, b }
 */
function updateArm(state, contextVector, reward) {
  // Guard: if state is missing or has null matrices, start fresh
  const safeState = (state && state.A && state.b) ? state : initArmState();
  
  const x = math.matrix(contextVector);
  const A = math.matrix(safeState.A);
  const b = math.matrix(safeState.b);

  const xxT = math.multiply(
    math.reshape(x, [FEATURE_DIM, 1]),
    math.reshape(x, [1, FEATURE_DIM])
  );
  const newA = math.add(A, xxT);
  const newB = math.add(b, math.multiply(reward, x));

  return {
    A: newA.toArray(),
    b: newB.toArray()
  };
}

/**
 * Initializes a fresh arm state (identity matrix A, zero vector b).
 */
function initArmState() {
  return {
    A: math.identity(FEATURE_DIM).toArray(),
    b: new Array(FEATURE_DIM).fill(0)
  };
}

/**
 * Converts student feedback + activity into a 0–1 reward signal.
 */
function rewardFromFeedback({ completion_status, interest_rating, usefulness_rating, visit_duration, interaction_type }) {
  let reward = 0;

  if (completion_status === "completed")    reward += 0.4;
  else if (completion_status === "in_progress") reward += 0.1;

  if (interest_rating)    reward += (interest_rating / 5)   * 0.3;
  if (usefulness_rating)  reward += (usefulness_rating / 5) * 0.2;

  if (visit_duration > 120)     reward += 0.1;
  else if (visit_duration > 30) reward += 0.05;

  if (interaction_type === "click")  reward += 0.05;
  if (interaction_type === "scroll") reward += 0.03;

  return Math.min(reward, 1.0); // cap at 1
}

module.exports = {
  buildContextVector,
  selectArm,
  updateArm,
  initArmState,
  rewardFromFeedback,
  FEATURE_DIM
};