// Shared helpers for the /api functions. The key comes only from the
// GEMINI_API_KEY secret configured in Cloudflare Pages.

export const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json",
};

export const reply = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: CORS });

export function profileText(p) {
  if (!p) return "No profile provided.";
  const bits = [];
  if (p.age) bits.push(`age ${p.age}`);
  if (p.sex) bits.push(p.sex);
  if (p.weight_kg) bits.push(`${p.weight_kg} kg`);
  if (p.height_cm) bits.push(`${p.height_cm} cm`);
  if (p.activity) bits.push(`activity: ${p.activity}`);
  if (p.goal) bits.push(`goal: ${p.goal}`);
  if (p.daily_calorie_target) bits.push(`daily target ~${p.daily_calorie_target} kcal`);
  if (p.notes) bits.push(`notes: ${String(p.notes).slice(0, 300)}`);
  return bits.length ? bits.join(", ") : "No profile provided.";
}

export function parseJson(text) {
  let t = (text || "").trim();
  if (t.startsWith("```json")) t = t.slice(7);
  else if (t.startsWith("```")) t = t.slice(3);
  if (t.endsWith("```")) t = t.slice(0, -3);
  return JSON.parse(t.trim());
}

export async function generate(env, { system, parts, temperature = 0.3, maxOutputTokens = 4096 }) {
  const apiKey = env.GEMINI_API_KEY;
  if (!apiKey) {
    const e = new Error("Server is missing the GEMINI_API_KEY secret.");
    e.status = 500;
    throw e;
  }
  const model = env.AI_MODEL || "gemini-2.5-flash-lite";
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const payload = {
    system_instruction: { parts: [{ text: system }] },
    contents: [{ parts }],
    // Thinking off: this is extraction, not reasoning. Cuts latency a lot.
    generationConfig: { temperature, maxOutputTokens, responseMimeType: "application/json", thinkingConfig: { thinkingBudget: 0 } },
  };

  const started = Date.now();
  for (let attempt = 0; attempt < 2; attempt++) {
    let resp;
    try {
      resp = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(40000),
      });
    } catch (e) {
      throw Object.assign(new Error("The AI took too long to respond. Try again."), { status: 504 });
    }
    console.log(`[ai] model=${model} status=${resp.status} ms=${Date.now() - started} attempt=${attempt}`);
    if (resp.status === 400 && payload.generationConfig.thinkingConfig) {
      // Model doesn't accept the thinking setting: retry once without it.
      delete payload.generationConfig.thinkingConfig;
      attempt--;
      continue;
    }
    if (resp.ok) {
      const data = await resp.json();
      const cand = data.candidates?.[0];
      if (!cand) throw Object.assign(new Error("No response from the AI service."), { status: 502 });
      if (cand.finishReason === "SAFETY") {
        throw Object.assign(new Error("That was blocked by safety filters. Try something else."), { status: 200 });
      }
      return cand.content?.parts?.map((p) => p.text || "").join("") || "";
    }
    if ((resp.status === 503 || resp.status === 429) && attempt === 0) {
      await new Promise((r) => setTimeout(r, 1200));
      continue;
    }
    let msg = `AI service error (${resp.status}).`;
    try { msg = (await resp.json()).error?.message || msg; } catch {}
    throw Object.assign(new Error(msg), { status: resp.status });
  }
}
