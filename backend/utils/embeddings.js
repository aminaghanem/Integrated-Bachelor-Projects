require("dotenv").config();

const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI({ apiKey: process.env.GEMINI_API_KEY });
const model = genAI.getGenerativeModel({ model: "text-embedding-004" });

/**
 * Returns a 768-dim Float32Array embedding for any text string.
 */
async function embedText(text) {
  const result = await model.embedContent(text);
  return result.embedding.values; // plain number array, 768 elements
}

/**
 * Builds a weighted text string from student interest_scores for embedding.
 * Higher score = more repetitions = stronger pull in vector space.
 * e.g. score 1.5 in "Math" → "Math Math" 
 */
function buildInterestText(interest_scores) {
  return interest_scores
    .filter(i => i.score > 0)
    .map(i => {
      const reps = Math.max(1, Math.round(i.score));
      return Array(reps).fill(i.category).join(" ");
    })
    .join(" ");
}

/**
 * Cosine similarity between two number arrays.
 */
function cosineSimilarity(a, b) {
  const dot = a.reduce((sum, val, i) => sum + val * b[i], 0);
  const magA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
  const magB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
  return dot / (magA * magB);
}

module.exports = { embedText, buildInterestText, cosineSimilarity };