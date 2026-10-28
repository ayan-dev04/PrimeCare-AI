/**
 * PrimeAI Controller – Google Gemini powered medical assistant
 *
 * Uses the official @google/genai SDK.
 * Endpoint: POST /api/ai/chat  →  { query: string }  →  { success, reply }
 */
const { GoogleGenAI } = require('@google/genai');

// ── Concise system prompt to guide responses and minimize prompt tokens ──
const SYSTEM_INSTRUCTION = `You are PrimeAI, the intelligent medical assistant for PrimeCare Hospital.
Roles:
• Recommend appropriate hospital departments based on symptoms.
• Provide general health guidance and hospital service info.
Rules:
• Keep answers strictly within 2 to 4 sentences.
• Never diagnose or prescribe medication.
• Always suggest consulting a hospital doctor for serious symptoms.`;

/**
 * POST /api/ai/chat
 * Body: { query: "user's question" }
 * Response: { success: true, reply: "AI response text" }
 */
exports.chat = async (req, res) => {
  try {
    // ── 1. Validate API key ──
    // Prioritize GEMINI_API_KEY from .env to prevent stale system-wide GOOGLE_API_KEY conflicts
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      console.error('[PrimeAI] Neither GEMINI_API_KEY nor GOOGLE_API_KEY is configured in .env.');
      return res.status(500).json({
        success: false,
        reply: "I'm having trouble connecting to PrimeAI right now. Please check your API configuration.",
      });
    }

    // ── 2. Validate request body ──
    const { query } = req.body;
    if (!query || typeof query !== 'string' || !query.trim()) {
      return res.status(400).json({
        success: false,
        reply: 'Please enter a valid question.',
      });
    }

    // ── 3. Initialize Gemini client (official @google/genai SDK) ──
    const ai = new GoogleGenAI({ apiKey });

    // ── 4. Generate content with gemini-2.5-flash & strict token optimization ──
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: query.trim(),
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        // Turn off internal chain-of-thought tokens for fast triage and maximum cost savings
        thinkingConfig: { thinkingBudget: 0 },
        maxOutputTokens: 200, // Guarantees concise responses (~2-4 sentences) under 75 total tokens
      },
    });

    // ── 5. Extract and validate response text ──
    const replyText = response.text?.trim();
    if (!replyText) {
      console.error('[PrimeAI] Gemini returned an empty response.');
      return res.status(500).json({
        success: false,
        reply: 'PrimeAI received an empty response. Please try rephrasing your question.',
      });
    }

    return res.json({ success: true, reply: replyText });
  } catch (err) {
    // ── 6. Full detailed error logging & safe JSON fallback ──
    console.error('[PrimeAI Detailed Error]:', err);
    return res.status(500).json({
      success: false,
      reply: "I'm having trouble connecting to PrimeAI right now. Please try again in a moment.",
    });
  }
};