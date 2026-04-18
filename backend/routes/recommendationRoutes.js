const { buildContextVector, selectArm, initArmState } = require("../utils/linucb");
const { buildInterestText, embedText, cosineSimilarity } = require("../utils/embeddings");
const CategoryCache = require("../models/categoryCacheModel");
const Student = require("../models/studentModel");
const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");

router.get("/", protect, async (req, res) => {
  try {
    const student = await Student.findById(req.user.id).populate("class_id");
    if (!student) return res.status(404).json({ error: "Student not found" });

    // 1. Build student interest embedding
    const interestText = buildInterestText(student.interests?.interest_scores ?? []);
    if (!interestText.trim()) {
      return res.json({ recommendations: [], message: "Browse more to get recommendations!" });
    }
    const studentVector = await embedText(interestText);

    // 2. Get all cached URLs that have embeddings
    const cachedUrls = await CategoryCache.find({
      embedding: { $exists: true, $not: { $size: 0 } }
    });

    if (cachedUrls.length === 0) {
      return res.json({ recommendations: [], message: "Not enough data yet!" });
    }

    // 3. Compute cosine similarity for each cached URL
    const arms = cachedUrls.map(item => ({
      url: item.url,
      category: item.category,
      page_title: item.page_title,
      embedding: item.embedding,
      cosineScore: cosineSimilarity(studentVector, item.embedding),
      linucbState: item.linucb || initArmState()
    }));

    // 4. Filter out very low similarity arms (< 0.2) to keep candidates relevant
    const candidates = arms
      .filter(a => a.cosineScore > 0.2)
      .sort((a, b) => b.cosineScore - a.cosineScore)
      .slice(0, 20); // top 20 candidates go into LinUCB

    if (candidates.length === 0) {
      return res.json({ recommendations: [], message: "Keep browsing to improve recommendations!" });
    }

    // 5. Build arm states map for LinUCB
    const armStates = {};
    candidates.forEach(a => { armStates[a.url] = a.linucbState; });

    // 6. Build student context vector
    const contextVector = buildContextVector(student);

    // 7. Run LinUCB to pick the best arm
    const { selectArm } = require("../utils/linucb");
    const selected = selectArm(candidates, contextVector, armStates);

    // 8. Return top 10 by final blended score (same formula as selectArm)
    // Re-score all candidates for ranking (selectArm only returns the best one)
    const math = require("mathjs");
    const ranked = candidates.map(arm => {
      const state = armStates[arm.url];
      
      // Validate state exists and has required properties
      if (!state || !state.A || !state.b) {
        return { ...arm, finalScore: arm.cosineScore };
      }
      
      try {
        const A = math.matrix(state.A);
        const b = math.matrix(state.b);
        const x = math.matrix(contextVector);
        const Ainv = math.inv(A);
        const theta = math.multiply(Ainv, b);
        const exploit = math.dot(theta, x);
        const explore = 0.3 * Math.sqrt(math.dot(x, math.multiply(Ainv, x)));
        const finalScore = 0.6 * (exploit + explore) + 0.4 * arm.cosineScore;
        return { ...arm, finalScore };
      } catch (mathError) {
        console.warn(`Math computation failed for ${arm.url}:`, mathError.message);
        return { ...arm, finalScore: arm.cosineScore };
      }
    }).sort((a, b) => b.finalScore - a.finalScore).slice(0, 10);

    res.json({
      recommendations: ranked.map(r => ({
        url: r.url.startsWith("http") ? r.url : `https://${r.url}`,
        title: r.page_title || r.url,
        category: r.category,
        cosineScore: r.cosineScore.toFixed(3),
        finalScore: r.finalScore.toFixed(3)
      }))
    });

  } catch (err) {
    console.error("Recommendation error:", err);
    res.status(500).json({ error: "Failed to generate recommendations" });
  }
});

module.exports = router;