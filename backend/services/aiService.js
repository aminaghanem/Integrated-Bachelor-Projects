const MODEL = "llama-3.3-70b-versatile";

// ─────────────────────────────────────────────
// HELPER — call Groq and parse JSON safely
// ─────────────────────────────────────────────
async function callGroq(systemPrompt, userPrompt) {
  const Groq = require("groq-sdk");
  const client = new Groq({ apiKey: process.env.GROQ_API_KEY });

  const completion = await client.chat.completions.create({
    model: MODEL,
    temperature: 0.7,
    max_completion_tokens: 512,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
  });

  const raw = completion.choices[0]?.message?.content?.trim() ?? "";

  // Strip any accidental markdown code fences
  const cleaned = raw
    .replace(/^```json\n?/, "")
    .replace(/^```\n?/, "")
    .replace(/\n?```$/, "")
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    throw new Error(`AI returned invalid JSON: ${cleaned}`);
  }
}

// ─────────────────────────────────────────────
// 1. QUIZ DIFFICULTY
// ─────────────────────────────────────────────
async function generateQuizQuestion({
  countryName,
  attempt,
  wrongAnswers,
  existingQuestions,
}) {
  const system = `You are an educational assistant for children aged 9-12 learning world geography and culture. Always respond with valid JSON only. No explanation, no markdown, no code blocks. Just raw JSON.`;

  const existingList = existingQuestions
    .map((q) => `"${q.question}"`)
    .join(", ");
  const wrongList =
    wrongAnswers.length > 0 ? wrongAnswers.join('", "') : "none";

  const user = `A child is taking a quiz about ${countryName}. These are the quiz questions already in the database: ${existingList}.

This is attempt number ${attempt}.
On their previous attempt they got these questions wrong: "${wrongList}".
They have now gotten 2 questions wrong in this attempt too.

Generate 1 easier multiple choice question about ${countryName} that avoids the topics they already struggled with, and that is different from all the existing quiz questions listed above.

Return exactly this JSON format:
{"question": "...", "options": ["A. ...", "B. ...", "C. ...", "D. ..."], "correctAnswer": "A", "difficulty": "easy", "reason": "..."}

The reason field should be a short note explaining why this question is easier, written for a developer not the child.`;

  return callGroq(system, user);
}

// ─────────────────────────────────────────────
// 2. KEYWORD GENERATOR
// ─────────────────────────────────────────────
async function generatePostcardKeywords({ countryName }) {
  const system = `You are a creative writing assistant for children aged 9-12. Always respond with valid JSON only. No explanation, no markdown, no code blocks. Just raw JSON.`;

  const user = `A child is making a postcard about ${countryName}. Suggest 5 short fun words or phrases they could write as their postcard title. Keep it simple and exciting for a 9-12 year old.

Return exactly this JSON format:
["word or phrase 1", "word or phrase 2", "word or phrase 3", "word or phrase 4", "word or phrase 5"]`;

  return callGroq(system, user);
}

// ─────────────────────────────────────────────
// 3. EMOTION DETECTOR
// ─────────────────────────────────────────────
async function detectPostcardEmotion({ text }) {
  const system = `You are analyzing text written by a child aged 9-12 as a postcard title. Always respond with valid JSON only. No explanation, no markdown, no code blocks. Just raw JSON.`;

  const user = `Analyze the emotion in this postcard text written by a child: "${text}"

The emotion should be one of: sad, bored, distressed, excited, confused, calm.

Return exactly this JSON format:
{"emotion": "excited", "message": "short developer alert note about the child's emotional state"}

The message is written for a developer to be alerted if the child is in distress.`;

  return callGroq(system, user);
}

// ─────────────────────────────────────────────
// 4. RECOMMENDATION
// ─────────────────────────────────────────────
async function recommendNextCountry({ exploredCountries }) {
  const system = `You are a fun travel guide for children aged 9-12. Always respond with valid JSON only. No explanation, no markdown, no code blocks. Just raw JSON.`;

  const explored = exploredCountries.join(", ");

  const user = `A child has already explored these countries: ${explored}.
Suggest 1 new country to explore next. Pick based on what they have already explored. Write the reason in a fun, exciting way for a 9-12 year old. Make sure to avoid any political or war-related words (like blow, explode, etc), and focus on fun cultural or historical facts that would excite a child.Also if possible, make sure the country recommended has something in common with all countries visited, or is a fun contrast to them.
{"country": "Japan", "reason": "Since you loved exploring Chinese food and landmarks, Japan will blow your mind with sushi, samurai castles, and cherry blossoms!"}`;

  return callGroq(system, user);
}

module.exports = {
  generateQuizQuestion,
  generatePostcardKeywords,
  detectPostcardEmotion,
  recommendNextCountry,
};
