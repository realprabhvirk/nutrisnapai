/**
 * Cloudflare Pages Function: /api/ask
 * Handles follow-up questions to the AI nutritionist about the current meal.
 */

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json",
};

export async function onRequest(context) {
  const { request } = context;

  if (request.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }

  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: `Method ${request.method} not allowed.` }), {
      status: 405,
      headers: CORS_HEADERS,
    });
  }

  return handleAsk(context);
}

export async function onRequestPost(context) {
  return handleAsk(context);
}

export async function onRequestOptions() {
  return new Response(null, { headers: CORS_HEADERS });
}

async function handleAsk(context) {
  try {
    const { request, env } = context;

    const apiKey = env.GEMINI_API_KEY || "AQ.Ab8RN6KCf4Kb0rEltshTHrN_vU1Jujh_QK5zKR9kuxV2ribR2Q";
    const model = env.GEMINI_MODEL || "gemini-flash-lite-latest";

    const body = await request.json().catch(() => null);
    if (!body || !body.question) {
      return new Response(
        JSON.stringify({ error: "Missing question in request body." }),
        { status: 400, headers: CORS_HEADERS }
      );
    }

    const { mealContext, question } = body;

    const prompt = `You are NutriSnap AI, a friendly, certified nutritionist.
Meal Context: ${mealContext || "A healthy meal"}

User Question: ${question}

Provide a concise, friendly, helpful 2-4 sentence response specifically tailored to this meal and the user's health inquiry.`;

    const payload = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.5,
        maxOutputTokens: 500,
      },
    };

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;

    const resp = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!resp.ok) {
      return new Response(
        JSON.stringify({ error: `AI error: HTTP ${resp.status}` }),
        { status: resp.status, headers: CORS_HEADERS }
      );
    }

    const data = await resp.json();
    const parts = data.candidates?.[0]?.content?.parts;
    const answer = parts && parts.length > 0 ? parts[0].text : "No answer returned.";

    return new Response(JSON.stringify({ answer: answer.trim() }), {
      status: 200,
      headers: CORS_HEADERS,
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: `Server error: ${err.message}` }),
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
