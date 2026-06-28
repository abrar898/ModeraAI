import Groq from 'groq-sdk';
import { GoogleGenAI } from '@google/genai';
import { MODERATION_CATEGORIES, CATEGORY_LABELS } from '../models/Policy.js';

// Clients are created lazily (inside the call functions) so that
// process.env is read at call-time, NOT at module-import time.
// ES module imports are resolved before dotenv.config() runs in index.js,
// which means top-level reads of process.env always see undefined for .env values.
function getGroqClient() {
  if (!process.env.GROQ_API_KEY) return null;
  return new Groq({ apiKey: process.env.GROQ_API_KEY });
}

function getGeminiClient() {
  if (!process.env.GEMINI_API_KEY) return null;
  return new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
}

// Vision-capable model on Groq's free tier. See https://console.groq.com/docs/vision
const GROQ_VISION_MODEL = 'meta-llama/llama-4-scout-17b-16e-instruct';
// Vision-capable model on Gemini's free tier, via the current @google/genai SDK.
// See https://ai.google.dev/gemini-api/docs/models
const GEMINI_VISION_MODEL = 'gemini-2.0-flash';

function buildPrompt(enabledCategories) {
  const categoryList = enabledCategories
    .map((c) => `- ${c.category} (${CATEGORY_LABELS[c.category]}): threshold ${c.confidenceThreshold}%`)
    .join('\n');

  return `You are an AI content moderation system. Analyze this image for policy violations across the following active categories:\n\n${categoryList}\n\nFor EACH category listed above, provide:\n1. detected: true/false (whether this content type is present)\n2. confidence: 0-100 (your confidence percentage)\n3. reasoning: brief explanation (1-2 sentences)\n\nReturn ONLY valid JSON in this exact format, no other text, no markdown code fences:\n{\n  "results": [\n    {\n      "category": "graphic_violence",\n      "detected": false,\n      "confidence": 5,\n      "reasoning": "No violence or physical harm depicted in the image."\n    }\n  ]\n}\n\nCategory keys must exactly match: ${enabledCategories.map((c) => c.category).join(', ')}`;
}

/**
 * Calls Groq's vision model. Throws on any failure so the caller can fall back to Gemini.
 */
async function callGroq(prompt, base64Image, mimetype) {
  const groqClient = getGroqClient();
  if (!groqClient) throw new Error('GROQ_API_KEY not configured');

  const response = await groqClient.chat.completions.create({
    model: GROQ_VISION_MODEL,
    max_completion_tokens: 1024,
    temperature: 0.2,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          { type: 'image_url', image_url: { url: `data:${mimetype};base64,${base64Image}` } },
        ],
      },
    ],
  });

  const text = response.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error('Empty response from Groq');
  return JSON.parse(text).results;
}

/**
 * Calls Gemini's vision model as a fallback.
 */
async function callGemini(prompt, base64Image, mimetype) {
  const geminiClient = getGeminiClient();
  if (!geminiClient) throw new Error('GEMINI_API_KEY not configured');

  const response = await geminiClient.models.generateContent({
    model: GEMINI_VISION_MODEL,
    contents: [
      {
        role: 'user',
        parts: [
          { text: prompt },
          { inlineData: { mimeType: mimetype, data: base64Image } },
        ],
      },
    ],
    config: {
      responseMimeType: 'application/json',
      temperature: 0.2,
    },
  });

  const text = response.text?.trim();
  if (!text) throw new Error('Empty response from Gemini');
  return JSON.parse(text).results;
}

export const moderateImage = async (imageBuffer, mimetype, activePolicy) => {
  const enabledCategories = activePolicy.categories.filter((c) => c.enabled);

  if (enabledCategories.length === 0) {
    return buildCleanResult(activePolicy);
  }

  const prompt = buildPrompt(enabledCategories);
  const base64Image = imageBuffer.toString('base64');

  // Try Groq first (primary, free tier). If it fails for any reason — rate
  // limit, timeout, malformed output — fall back to Gemini (secondary, free
  // tier) before giving up and flagging for manual review.
  const providers = [
    { name: 'Groq', call: () => callGroq(prompt, base64Image, mimetype) },
    { name: 'Gemini', call: () => callGemini(prompt, base64Image, mimetype) },
  ];

  let lastError;
  for (const provider of providers) {
    try {
      const results = await provider.call();
      return processAIResults(results, activePolicy, provider.name);
    } catch (error) {
      lastError = error;
      console.error(`${provider.name} moderation error:`, error.message);
      // try the next provider, if any
    }
  }

  console.error('All AI providers failed:', lastError?.message);
  // Fail safe: flag for manual review rather than silently approving or crashing.
  return {
    outcome: 'flagged',
    categoryResults: enabledCategories.map((cp) => ({
      category: cp.category,
      detected: false,
      confidence: 0,
      reasoning: 'AI analysis unavailable – flagged for manual review.',
      meetsThreshold: false,
    })),
  };
};

function processAIResults(aiResults, activePolicy, provider) {
  const categoryResults = [];
  let hasBlock = false;
  let hasFlag = false;

  for (const cp of activePolicy.categories) {
    if (!cp.enabled) {
      categoryResults.push({
        category: cp.category,
        detected: false,
        confidence: 0,
        reasoning: 'Category disabled.',
        meetsThreshold: false,
      });
      continue;
    }

    const aiResult = aiResults?.find((r) => r.category === cp.category) || {
      detected: false,
      confidence: 0,
      reasoning: 'No result from AI.',
    };

    const meetsThreshold = aiResult.detected && aiResult.confidence >= cp.confidenceThreshold;

    categoryResults.push({
      category: cp.category,
      detected: aiResult.detected,
      confidence: aiResult.confidence,
      reasoning: aiResult.reasoning,
      meetsThreshold,
    });

    if (meetsThreshold) {
      if (cp.enforcementBehavior === 'auto_block') hasBlock = true;
      else hasFlag = true;
    }
  }

  const outcome = hasBlock ? 'blocked' : hasFlag ? 'flagged' : 'approved';
  return { outcome, categoryResults, aiProvider: provider };
}

function buildCleanResult(activePolicy) {
  return {
    outcome: 'approved',
    categoryResults: activePolicy.categories.map((cp) => ({
      category: cp.category,
      detected: false,
      confidence: 0,
      reasoning: 'Category disabled.',
      meetsThreshold: false,
    })),
  };
}
