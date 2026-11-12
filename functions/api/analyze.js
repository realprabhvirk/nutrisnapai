/**
 * Cloudflare Pages Function: /api/analyze
 * Runs server-side at Cloudflare's Edge. The API key is hidden from the browser.
 */

const SYSTEM_PROMPT = `You are NutriSnap, a world-class clinical nutritionist and food computer-vision expert.
When given an image of food or a drink:

1. Identify every visible item (ingredients, beverages, condiments, garnishes).
2. Estimate realistic portion sizes based on plate size, cup dimensions, and visual scale.
3. Compute nutritional breakdown according to standard USDA FoodData Central databases.
4. Categorize with relevant dietary tags (e.g. High Protein, Low Carb, Keto Friendly, Vegan, Dairy-Free, Gluten-Free, High Fiber, Heart Healthy).
5. Calculate macro percentage of total calories:
   - Protein calories = protein_g * 4
   - Carbs calories = carbs_g * 4
   - Fat calories = fat_g * 9

Return ONLY a valid JSON object with this exact structure — no markdown fences, no explanatory text outside the JSON:

{
  "items": [
    {
      "name": "Grilled Chicken Breast",
      "portion": "180g (approx 1 breast)",
      "calories": 297,
      "protein_g": 54,
      "carbs_g": 0,
      "fat_g": 6.5,
      "fiber_g": 0,
      "sugar_g": 0
    }
  ],
  "totals": {
    "calories": 450,
    "protein_g": 58,
    "carbs_g": 32,
    "fat_g": 10,
    "fiber_g": 5,
    "sugar_g": 3
  },
  "macro_percentages": {
    "protein_pct": 52,
    "carbs_pct": 28,
    "fat_pct": 20
  },
  "dietary_tags": ["High Protein", "Low Sugar", "Gluten-Free"],
  "summary": "High-protein meal with lean poultry and complex greens.",
  "health_tip": "Excellent for post-workout muscle recovery with minimal saturated fat."
}

Rules:
- All numeric values must be numbers, NOT strings.
- If the image contains NO food or drink whatsoever (e.g. cars, buildings, animals, documents), return:
  {"error": "No food or drink detected. Please snap a photo of a meal, snack, or beverage."}
- If portion or ingredients are ambiguous, make your best evidence-based estimate and state assumptions in the summary.
- NEVER wrap in markdown code blocks like \`\`\`json. Return pure JSON only.`;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json",
};

export async function onRequest(context) {
  const { request } = context;

  // Handle CORS preflight
  if (request.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }

  // Only allow POST
  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: `Method ${request.method} not allowed. Please use POST.` }), {
      status: 405,
      headers: CORS_HEADERS,
    });
  }

  return handleAnalyze(context);
}

// Fallback method-specific handlers for Cloudflare Pages router
export async function onRequestPost(context) {
  return handleAnalyze(context);
}

export async function onRequestOptions() {
  return new Response(null, { headers: CORS_HEADERS });
}

async function handleAnalyze(context) {
  try {
    const { request, env } = context;

    const apiKey = env.GEMINI_API_KEY || "AQ.Ab8RN6KCf4Kb0rEltshTHrN_vU1Jujh_QK5zKR9kuxV2ribR2Q";
    const model = env.GEMINI_MODEL || "gemini-flash-lite-latest";

    const body = await request.json().catch(() => null);
    if (!body || !body.image) {
      return new Response(
        JSON.stringify({ error: "Missing image data in request body." }),
        { status: 400, headers: CORS_HEADERS }
      );
    }

    const mimeType = body.mimeType || "image/jpeg";
    const imageBase64 = body.image;

    const geminiPayload = {
      system_instruction: {
        parts: [{ text: SYSTEM_PROMPT }],
      },
      contents: [
        {
          parts: [
            {
              inlineData: {
                mimeType: mimeType,
                data: imageBase64,
              },
            },
            {
              text: "Analyze this food or drink image and provide the complete nutritional breakdown in the requested JSON format.",
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.2,
        topP: 0.9,
        maxOutputTokens: 2048,
      },
    };

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;

    let geminiResponse = null;
    for (let attempt = 0; attempt < 2; attempt++) {
      const resp = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(geminiPayload),
      });

      if (resp.ok) {
        geminiResponse = await resp.json();
        break;
      }

      if ((resp.status === 503 || resp.status === 429) && attempt === 0) {
        await new Promise((r) => setTimeout(r, 1200));
        continue;
      }

      const errText = await resp.text();
      let errMsg = `Gemini API error: ${resp.status}`;
      try {
        const errJson = JSON.parse(errText);
        if (errJson.error && errJson.error.message) {
          errMsg = errJson.error.message;
        }
      } catch (e) {}
      return new Response(JSON.stringify({ error: errMsg }), {
        status: resp.status,
        headers: CORS_HEADERS,
      });
    }

    if (!geminiResponse || !geminiResponse.candidates || geminiResponse.candidates.length === 0) {
      return new Response(
        JSON.stringify({ error: "No response returned by AI." }),
        { status: 502, headers: CORS_HEADERS }
      );
    }

    const firstCandidate = geminiResponse.candidates[0];
    if (firstCandidate.finishReason === "SAFETY") {
      return new Response(
        JSON.stringify({ error: "Image was flagged by safety filters. Please try another photo." }),
        { status: 200, headers: CORS_HEADERS }
      );
    }

    const parts = firstCandidate.content?.parts;
    let rawText = parts && parts.length > 0 ? parts[0].text : "";

    let clean = rawText.trim();
    if (clean.startsWith("```json")) {
      clean = clean.slice(7);
    } else if (clean.startsWith("```")) {
      clean = clean.slice(3);
    }
    if (clean.endsWith("```")) {
      clean = clean.slice(0, -3);
    }
    clean = clean.trim();

    try {
      const parsed = JSON.parse(clean);
      return new Response(JSON.stringify(parsed), {
        status: 200,
        headers: CORS_HEADERS,
      });
    } catch (e) {
      return new Response(
        JSON.stringify({
          error: "Could not format nutritional breakdown. Please try again with a clearer photo.",
          raw_response: rawText,
        }),
        { status: 200, headers: CORS_HEADERS }
      );
    }
  } catch (err) {
    return new Response(
      JSON.stringify({ error: `Server error: ${err.message}` }),
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
