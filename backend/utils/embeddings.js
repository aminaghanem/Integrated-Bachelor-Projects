let pipeline = null;

// Lazy-load the model once on first use — takes ~5s the first time,
// then it's cached locally on disk forever after
async function getEmbedder() {
  if (pipeline) return pipeline;

  console.log("⏳ Loading embedding model...");
  // Dynamic import because @xenova/transformers is ESM
  const { pipeline: createPipeline } = await import("@xenova/transformers");
  pipeline = await createPipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");
  console.log("✅ Embedding model loaded");

  return pipeline;
}

/**
 * Returns a 384-dim number array embedding for any text string.
 * Completely free, runs locally, no API key needed.
 */
async function embedText(text) {
  const embedder = await getEmbedder();
  const output = await embedder(text, { pooling: "mean", normalize: true });
  return Array.from(output.data); // plain JS number array, 384 elements
}

/**
 * Builds a weighted text string from student interest_scores.
 * Higher score = more repetitions = stronger pull in vector space.
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
  if (a.length !== b.length) return 0;
  const dot = a.reduce((sum, val, i) => sum + val * b[i], 0);
  const magA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
  const magB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
  if (magA === 0 || magB === 0) return 0;
  return dot / (magA * magB);
}

module.exports = { embedText, buildInterestText, cosineSimilarity };