require("dotenv").config();
const mongoose = require("mongoose");
const axios = require("axios");
const cheerio = require("cheerio");
const CategoryCache = require("./models/categoryCacheModel");

// Pre-load the embedding model before connecting
let embedText;

const EDUCATIONAL_SITES = [
  // Math
  { url: "mathsisfun.com", category: "Math" },
  { url: "khanacademy.org/math", category: "Math" },
  { url: "mathway.com", category: "Math" },
  { url: "desmos.com", category: "Math" },
  { url: "wolframalpha.com", category: "Math" },
  { url: "brilliant.org", category: "Math" },
  { url: "purplemath.com", category: "Algebra" },
  { url: "geometryhelp.net", category: "Geometry" },

  // Science
  { url: "khanacademy.org/science", category: "Science" },
  { url: "phet.colorado.edu", category: "Physics" },
  { url: "physicsclassroom.com", category: "Physics" },
  { url: "chemguide.co.uk", category: "Chemistry" },
  { url: "ptable.com", category: "Chemistry" },
  { url: "biology-online.org", category: "Biology" },
  { url: "bbc.co.uk/bitesize/subjects/z9ddmp3", category: "Biology" },
  { url: "nasa.gov", category: "Space" },
  { url: "space.com", category: "Space" },
  { url: "nationalgeographic.com/science", category: "Science" },

  // English & Language
  { url: "vocabulary.com", category: "English" },
  { url: "englishclub.com", category: "English" },
  { url: "grammarly.com", category: "English" },
  { url: "readwritethink.org", category: "English" },
  { url: "merriam-webster.com", category: "English" },
  { url: "british council.org/english", category: "English" },

  // History & Geography
  { url: "history.com", category: "History" },
  { url: "bbc.co.uk/history", category: "History" },
  { url: "worldatlas.com", category: "Geography" },
  { url: "natgeokids.com", category: "Geography" },
  { url: "britannica.com", category: "History" },

  // Computer Science & Coding
  { url: "code.org", category: "Computer Science" },
  { url: "scratch.mit.edu", category: "Computer Science" },
  { url: "codecademy.com", category: "Computer Science" },
  { url: "w3schools.com", category: "Computer Science" },
  { url: "cs50.harvard.edu", category: "Computer Science" },

  // Art & Creative
  { url: "khanacademy.org/humanities/art-history", category: "Art" },
  { url: "tate.org.uk/learn", category: "Art" },
  { url: "drawinghowtodraw.com", category: "Art" },

  // General Learning Platforms
  { url: "coursera.org", category: "Learning" },
  { url: "edx.org", category: "Learning" },
  { url: "ted.com/ed", category: "Learning" },
  { url: "duolingo.com", category: "Language" },
  { url: "quizlet.com", category: "Learning" },
  { url: "wikipedia.org", category: "Research" },
  { url: "scholastic.com", category: "Reading" },
  { url: "newsela.com", category: "Reading" },
];

async function fetchTitle(url) {
  const fullUrl = url.startsWith("http") ? url : `https://${url}`;
  try {
    const res = await axios.get(fullUrl, {
      timeout: 8000,
      headers: { "User-Agent": "Mozilla/5.0" }
    });
    const $ = cheerio.load(res.data);
    const title = $("title").text().trim();
    return title || url;
  } catch {
    // Return a clean fallback title from the URL
    return url
      .replace(/^https?:\/\//, "")
      .replace(/\/.*/g, "")
      .replace(/\.(com|org|net|edu|co\.uk)/, "")
      .split(".")
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  }
}

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("✅ Connected to MongoDB");

  // Load embedding model
  const embeddingsModule = require("./utils/embeddings");
  embedText = embeddingsModule.embedText;

  // Warm up the model
  console.log("⏳ Warming up embedding model...");
  await embedText("test");
  console.log("✅ Embedding model ready\n");

  let created = 0, skipped = 0, failed = 0;

  for (const site of EDUCATIONAL_SITES) {
    const domain = site.url.replace(/^https?:\/\//, "").split("/")[0];

    // Skip if already cached with an embedding
    const existing = await CategoryCache.findOne({ url: site.url });
    if (existing && existing.embedding && existing.embedding.length > 0) {
      console.log(`⏭  Skipping (already cached): ${site.url}`);
      skipped++;
      continue;
    }

    try {
      console.log(`🔄 Processing: ${site.url}`);
      const title = await fetchTitle(site.url);
      const embeddingText = `${title} ${site.category}`;
      const embedding = await embedText(embeddingText);

      await CategoryCache.findOneAndUpdate(
        { url: site.url },
        {
          url: site.url,
          category: site.category,
          page_title: title,
          embedding,
          updatedAt: new Date()
        },
        { upsert: true }
      );

      console.log(`   ✅ Saved: "${title}" → ${site.category} (${embedding.length} dims)`);
      created++;

      // Small delay to avoid hammering sites
      await new Promise(r => setTimeout(r, 300));

    } catch (err) {
      console.error(`   ❌ Failed: ${site.url} — ${err.message}`);
      failed++;
    }
  }

  console.log(`\n📊 Done: ${created} created, ${skipped} skipped, ${failed} failed`);
  await mongoose.disconnect();
  process.exit(0);
}

seed().catch(err => {
  console.error("Seed failed:", err);
  process.exit(1);
});