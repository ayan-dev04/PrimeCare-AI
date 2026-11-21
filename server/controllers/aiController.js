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
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      console.error('[PrimeAI] Neither GEMINI_API_KEY nor GOOGLE_API_KEY is configured in .env.');
      return res.status(500).json({
        success: false,
        reply: "PrimeAI assistant is currently undergoing scheduled maintenance. Please check your GEMINI_API_KEY configuration.",
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

    // ── 4. Generate content with supported models ──
    let response = null;
    const modelCandidates = ['gemini-2.5-flash', 'gemini-1.5-flash', 'gemini-2.0-flash'];

    for (const modelName of modelCandidates) {
      try {
        response = await ai.models.generateContent({
          model: modelName,
          contents: query.trim(),
          config: {
            systemInstruction: SYSTEM_INSTRUCTION,
            maxOutputTokens: 200,
          },
        });
        if (response && response.text) break;
      } catch (modelErr) {
        console.warn(`[PrimeAI] Model ${modelName} call notice:`, modelErr.message || modelErr);
        if (modelErr.status === 401 || (modelErr.message && modelErr.message.includes('API key not valid'))) {
          // Bad API key should immediately report a clear user-facing error rather than 500 crash
          return res.status(200).json({
            success: false,
            reply: 'PrimeAI service error: The configured GEMINI_API_KEY is invalid or expired. Please update it with a valid Gemini API key from Google AI Studio.'
          });
        }
        continue;
      }
    }

    if (!response || !response.text) {
      return res.status(200).json({
        success: false,
        reply: 'PrimeAI service error: Unable to contact Gemini AI models. Please ensure your GEMINI_API_KEY has active quota in Google AI Studio.'
      });
    }

    // ── 5. Extract and validate response text ──
    const replyText = response.text.trim();
    return res.json({ success: true, reply: replyText });
  } catch (err) {
    console.error('[PrimeAI Error]:', err.message);
    return res.status(200).json({
      success: false,
      reply: "I'm having trouble connecting to PrimeAI right now. Please try again in a moment.",
    });
  }
};
