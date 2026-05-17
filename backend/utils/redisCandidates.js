const redis = require("./redisClient");

const CATEGORY_ALIASES = {
  "languages": "Language", "language learning": "Language",
  "english": "Language", "mathematics": "Math", "maths": "Math",
  "coding": "Computer Science", "programming": "Computer Science",
  "education": "Learning", "e-learning": "Learning",
  "literature": "Reading", "books": "Reading",
  "natural science": "Science", "sciences": "Science",
  "Learning": "Educational",  // ← add this, appears in your Redis data
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
    // Match the actual key pattern your friend uses
    const keys = await redis.keys("student:*:history:*");

    if (!keys.length) {
      console.log("⚠️ Redis returned no keys (tried pattern: student:*:history:*)");
      return [];
    }

    console.log(`🔑 Found ${keys.length} keys in Redis`);

    const values = await redis.mget(...keys);
    const candidates = [];
    const seenUrls = new Set(); // deduplicate same URL across multiple students

    for (const raw of values) {
      if (!raw) continue;
      let data;
      try { data = JSON.parse(raw); } catch { continue; }

      const classification = data.classification || {};

      // Skip unsuitable
      if (classification.suitability_for_school === "Unsuitable") continue;

      // Skip age-restricted
      if (maxAge && classification.age_restriction) {
        const ageStr = classification.age_restriction.toString().toLowerCase();
        if (ageStr === "all ages" || ageStr === "all") {
          // always include
        } else {
          const minAge = parseInt(ageStr);
          if (!isNaN(minAge) && maxAge < minAge) continue;
        }
      }

      const fullUrl = classification.url || "";
      const normalizedUrl = normalizeUrl(fullUrl);

      // Skip duplicates (same URL visited by multiple students)
      if (seenUrls.has(normalizedUrl)) continue;
      seenUrls.add(normalizedUrl);

      candidates.push({
        url: normalizedUrl,
        fullUrl,
        category: normalizeCategory(classification.category || "General"),
        educational_genre: classification.educational_genre || "",
        age_restriction: classification.age_restriction || "All Ages",
        safe_alternatives: classification.safe_alternatives || []
      });
    }

    console.log(`📦 Redis: ${candidates.length} suitable unique candidates`);
    return candidates;
  } catch (err) {
    console.error("Redis fetch failed:", err.message);
    return [];
  }
}

async function getCategoryFromRedis(url) {
  try {
    const normalizedInput = normalizeUrl(url);

    // Search for any key that ends with this URL (any student's history)
    const pattern = `student:*:history:*${normalizedInput}*`;
    console.log(`🔍 Searching Redis pattern: ${pattern}`);

    const matchingKeys = await redis.keys(pattern);

    if (matchingKeys.length === 0) {
      // Also try with https:// prefix variations
      const patterns = [
        `student:*:history:https://${normalizedInput}`,
        `student:*:history:https://${normalizedInput}/`,
        `student:*:history:https://www.${normalizedInput}`,
        `student:*:history:https://www.${normalizedInput}/`,
      ];

      for (const p of patterns) {
        const keys = await redis.keys(p);
        if (keys.length > 0) {
          matchingKeys.push(...keys);
          break;
        }
      }
    }

    if (matchingKeys.length === 0) {
      console.log(`⚠️ ${url} not found in Redis`);
      return null;
    }

    // Use the most recently accessed entry (highest access_count)
    let bestRaw = null;
    let bestCount = -1;

    for (const key of matchingKeys) {
      const raw = await redis.get(key);
      if (!raw) continue;
      const data = JSON.parse(raw);
      if ((data.access_count || 0) > bestCount) {
        bestCount = data.access_count || 0;
        bestRaw = data;
      }
    }

    if (!bestRaw) return null;

    const category = bestRaw.classification?.category;
    const result = normalizeCategory(category || "General");
    console.log(`✅ Category from Redis: ${result} (key pattern matched ${matchingKeys.length} entries)`);
    return result;

  } catch (err) {
    console.error("Redis single lookup failed:", err.message);
    return null;
  }
}

module.exports = { getRedisCandidates, getCategoryFromRedis, normalizeUrl };