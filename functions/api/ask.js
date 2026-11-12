// POST /api/ask  { question, analysis, multiplier, profile?, history? }
//   -> { reply: string, analysis: object | null }
// If the user corrects the meal (different dish, added/removed ingredient,
// different amount) the model returns a full re-analysis in `analysis`.
import { CORS, reply, profileText, parseJson, generate } from "../_ai.js";

const SYSTEM = `You are the user's personal nutritionist inside a meal-scanning app. You are given the current analysis of their meal (JSON), their profile, and the recent chat.

Decide what the user's message is:
A) A correction or change: the dish is something else, an ingredient was added/removed/swapped, or a quantity or portion is different (e.g. "that's brown rice", "no dressing", "I had two of them", "add an avocado").
   -> Recompute the WHOLE analysis with that change applied. Keep everything that was not changed. Return it in "analysis" using exactly the same JSON shape as the current analysis (meal_name, items, totals, dietary_tags, summary, health_tip). Totals must equal the sum of items. Update meal_name, summary and health_tip if they no longer fit.
B) A question or conversation: answer it. Set "analysis" to null.

Always return ONLY this JSON:
{"reply": "...", "analysis": null}

Reply style: 1 to 3 short sentences, direct, specific to this meal and this person's profile and goal. For corrections, say what changed and the new calorie total. No emoji, no filler, no disclaimers unless something is a real health risk.`;

export const onRequestOptions = () => new Response(null, { headers: CORS });

export async function onRequestPost({ request, env }) {
  try {
    const body = await request.json().catch(() => null);
    if (!body?.question || !body?.analysis) return reply({ error: "Missing question or analysis." }, 400);

    const history = (body.history || [])
      .slice(-8)
      .map((m) => `${m.role === "user" ? "User" : "Nutritionist"}: ${String(m.text).slice(0, 500)}`)
      .join("\n");

    const prompt = `User profile: ${profileText(body.profile)}

Current analysis (baseline 1x portion):
${JSON.stringify(body.analysis)}

The user is currently viewing it at ${body.multiplier || 1}x portion.

Recent chat:
${history || "(none)"}

User message: ${String(body.question).slice(0, 800)}`;

    const text = await generate(env, {
      system: SYSTEM,
      temperature: 0.3,
      parts: [{ text: prompt }],
    });

    let out;
    try {
      out = parseJson(text);
    } catch {
      return reply({ reply: text.trim() || "I couldn't answer that. Try rephrasing.", analysis: null });
    }
    const valid = out.analysis && out.analysis.totals && Array.isArray(out.analysis.items);
    return reply({ reply: out.reply || "Updated.", analysis: valid ? out.analysis : null });
  } catch (err) {
    return reply({ error: err.message }, err.status || 500);
  }
}
