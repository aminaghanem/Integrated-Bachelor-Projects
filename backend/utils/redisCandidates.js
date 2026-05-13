const redis = require("./redisClient");

const CATEGORY_ALIASES = {
  "languages": "Language", "language learning": "Language",
  "english": "Language", "mathematics": "Math", "maths": "Math",
  "coding": "Computer Science", "programming": "Computer Science",
  "education": "Learning", "e-learning": "Learning",
  "literature": "Reading", "books": "Reading",
  "natural science": "Science", "sciences": "Science",
};

function normalizeCategory(raw) {
  if (!raw) return "General";
  return CATEGORY_ALIASES[raw.trim().toLowerCase()] || raw.trim();
}

function normalizeUrl(url) {
  return url
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/$/, "");
}

async function getRedisCandidates({ maxAge } = {}) {
  try {
    const keys = await redis.keys("url:*");
    if (!keys.length) { console.log("⚠️ Redis returned no keys"); return []; }

    const values = await redis.mget(...keys);
    const candidates = [];

    for (const raw of values) {
      if (!raw) continue;
      let data;
      try { data = JSON.parse(raw); } catch { continue; }

      const classification = data.classification || {};

      // Skip unsuitable
      if (classification.suitability_for_school === "Unsuitable") continue;

      // Skip age-restricted
      if (maxAge && classification.age_restriction) {
        const minAge = parseInt(classification.age_restriction);
        if (!isNaN(minAge) && maxAge < minAge) continue;
      }

      candidates.push({
        url: normalizeUrl(classification.url || ""),
        fullUrl: classification.url || "",
        category: normalizeCategory(classification.category || "General"),
        educational_genre: classification.educational_genre || "",
        age_restriction: classification.age_restriction || "3+",
        safe_alternatives: classification.safe_alternatives || []
      });
    }

    console.log(`📦 Redis: ${candidates.length} suitable candidates`);
    return candidates;
  } catch (err) {
    console.error("Redis fetch failed:", err.message);
    return [];
  }
}

async function getCategoryFromRedis(url) {
  try {
    const domain = normalizeUrl(url);
    const keysToTry = [
      `url:https://${domain}`,
      `url:https://${domain}/`,
      `url:https://www.${domain}`,
      `url:http://${domain}`,
      `url:${domain}`,
    ];

    console.log("🔍 Trying Redis keys:", keysToTry);

    for (const key of keysToTry) {
      const raw = await redis.get(key);
      if (raw) {
        const data = JSON.parse(raw);
        const category = data.classification?.category;
        return normalizeCategory(category || "General");
      }
    }

    // Pattern match fallback
    const matchingKeys = await redis.keys(`url:*${domain}*`);
    if (matchingKeys.length > 0) {
      const raw = await redis.get(matchingKeys[0]);
      if (raw) {
        const data = JSON.parse(raw);
        return normalizeCategory(data.classification?.category || "General");
      }
    }

    return null;
  } catch (err) {
    console.error("Redis single lookup failed:", err.message);
    return null;
  }
}
module.exports = { getRedisCandidates, getCategoryFromRedis, normalizeUrl };