# NutriSnap

Photograph a meal, get calories and macros tailored to your profile. Chat with the nutritionist to correct the dish or ingredients and it recalculates.

- Static front end (`index.html`, `styles.css`, `app.js`) + Cloudflare Pages Functions in `functions/`.
- Profile, scan history and daily log are stored in the browser (localStorage).

## Deploy (Cloudflare Pages)

1. Connect the repo. Framework preset: None. No build command. Output directory: `/`.
2. Settings → Variables and Secrets → add a **secret** named `GEMINI_API_KEY`.
3. Optional: `AI_MODEL` to override the model (default `gemini-2.5-flash-lite`, the low-latency tier). No redeploy of code needed, just change the variable.

The key is only read server-side by the functions; it is never in the front-end code.

## Local dev

```bash
npx wrangler pages dev . --binding GEMINI_API_KEY=your-key
```

## Endpoints

- `POST /api/analyze` — `{ image, mimeType, profile }` → nutrition JSON
- `POST /api/ask` — `{ question, analysis, profile, history }` → `{ reply, analysis }`; `analysis` is a full re-analysis when the user corrects the meal.
