// POST /api/recipe  { suggestion, analysis, profile? }  ->  { title, time_min, ingredients[], steps[], result }
import { CORS, reply, profileText, parseJson, generate } from "../_ai.js";

const SYSTEM = `You are a practical home-cooking nutritionist. The user has a meal and picked one improvement idea. Tell them exactly how to make that change.

Return ONLY JSON:
{"title": "Cauliflower rice swap", "time_min": 10, "ingredients": ["1 cup riced cauliflower", "1 tsp olive oil"], "steps": ["Heat oil in a pan over medium heat.", "..."], "result": "About 310 kcal, 48g protein, 6g fiber for the whole meal."}

Rules:
- Only the steps and ingredients needed for THIS change applied to THIS meal, with quantities.
- 3 to 6 short steps. Plain language, no emoji, no filler.
- "result" is the estimated new meal totals after the change, one sentence.
- Respect the user's profile, diet notes and allergies.`;

export const onRequestOptions = () => new Response(null, { headers: CORS });

export async function onRequestPost({ request, env }) {
  try {
    const body = await request.json().catch(() => null);
    if (!body?.suggestion || !body?.analysis) return reply({ error: "Missing suggestion or analysis." }, 400);

    const text = await generate(env, {
      system: SYSTEM,
      temperature: 0.4,
      parts: [{ text: `User profile: ${profileText(body.profile)}

Current meal:
${JSON.stringify({ meal_name: body.analysis.meal_name, items: body.analysis.items, totals: body.analysis.totals })}

Chosen improvement: ${String(body.suggestion.title).slice(0, 200)}${body.suggestion.benefit ? ` (${String(body.suggestion.benefit).slice(0, 200)})` : ""}` }],
    });

    try {
      return reply(parseJson(text));
    } catch {
      return reply({ error: "Couldn't format the recipe. Try again." });
    }
  } catch (err) {
    return reply({ error: err.message }, err.status || 500);
  }
}
