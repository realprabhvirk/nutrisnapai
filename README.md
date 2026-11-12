# 🥗 NutriSnap — AI Food & Drink Nutritionist (iPhone PWA)

Snap a photo of your food or drink and get instant, AI-powered nutritional analysis powered by **Google Gemini Flash-Lite** (Google's cheapest and fastest model tier).

Built as an **Apple iPhone Progressive Web App (PWA)** with a sleek dark-mode health dashboard, client-side camera optimization, interactive portion scaling, daily calorie tracking, and an AI nutritionist assistant.

---

## ☁️ Deploying to Cloudflare Pages

Cloudflare Pages is a serverless platform that does not run Python (`server.py`). 

Instead, NutriSnap uses **Cloudflare Pages Functions** located in the [`functions/`](file:///c:/Users/PrabhpalVirk/Downloads/Google%20API%20Demo%20Website/functions) directory. These functions run securely at Cloudflare's Edge, acting as the serverless proxy to Gemini with your **API key 100% hidden from the browser**.

### How to Upload to Cloudflare Pages:

#### Method A: Direct Upload (Drag & Drop)
1. Go to your [Cloudflare Dashboard](https://dash.cloudflare.com/) → **Workers & Pages** → **Create application** → **Pages** → **Upload assets**.
2. Name your project (e.g. `nutrisnap`).
3. Drag and drop this entire project folder (make sure the `functions` folder is inside!).
4. Click **Deploy site**.
5. Your site is live immediately! Cloudflare automatically activates the edge backend functions at `/api/analyze` and `/api/ask`.

#### Method B: Git Integration (GitHub / GitLab)
1. Push this folder to a GitHub repository.
2. In Cloudflare Pages, connect your repository.
3. Build configuration:
   * **Framework preset**: `None`
   * **Build command**: *(leave empty)*
   * **Build output directory**: *(leave empty or `.`, root)*
4. (Optional) Set your secret environment variable in Cloudflare:
   * Go to **Settings** → **Environment variables**
   * Add: `GEMINI_API_KEY` = `your-api-key`
5. Click **Save and Deploy**.

---

## 🔒 Security: Hidden API Key

Your Gemini API key is stored **exclusively server-side** in:
- Cloudflare Pages: `functions/api/analyze.js` (and optional Cloudflare environment variables)
- Local testing: `server.py`

It is **never sent to the client browser**, never exposed in `index.html` or `app.js`, and cannot be extracted from network devtools.

---

## 💻 Local Testing with Python

If testing on your local computer or local Wi-Fi:
```bash
python server.py
```
This starts the local Python server on port `8000` and displays:
* **Local PC URL:** `http://localhost:8000`
* **iPhone Wi-Fi URL:** `http://<your-local-ip>:8000` (e.g. `http://192.168.1.247:8000`)

---

## 📱 How to Use on Your iPhone

1. Open your Cloudflare Pages URL in **Apple Safari** on your iPhone (e.g. `https://nutrisnap.pages.dev`).
2. Tap the **Share** button (the square with an arrow pointing up at the bottom).
3. Scroll down and tap **"Add to Home Screen"**, then tap **Add**.
4. Launch **NutriSnap** directly from your iPhone home screen! It opens as a full-screen native app with no address bar.

---

## ✨ Features

1. **Instant Camera & Gallery Capture**:
   * Uses `<input type="file" capture="environment">` to launch your iPhone's camera directly.
   * Client-side canvas compression downscales high-res iPhone photos (from 10MB down to ~200KB) for **sub-second upload speeds**.
   * Desktop drag-and-drop zone included.

2. **⚡ 4 Instant Sample Foods**:
   * Test the app in 1 tap without needing a camera:
     * 🥗 Salmon Avocado Power Bowl
     * 🍓 Berry Protein Smoothie
     * 🍜 Chicken Caesar Salad Bowl
     * ☕ Iced Caramel Oat Latte

3. **Portion Adjustment Multiplier**:
   * Toggle between **0.5x (Half)**, **1.0x (Standard)**, **1.5x (Large)**, and **2.0x (Double)** to dynamically recalculate all calories and macros in real-time.

4. **Visual Nutritional Dashboard**:
   * **Circular Calorie Gauge** with animated fill showing percentage of 2,000 kcal daily intake.
   * **Tri-Color Macronutrient Energy Bar**: Protein (cyan), Carbs (amber), Fat (coral).
   * **Core Macros**: Protein (g & kcal), Carbs (g & kcal), Fat (g & kcal).
   * **Micronutrients**: Dietary Fiber (g), Total Sugars (g), Net Carbs (g).
   * **Dietary Badges**: Automatic categorization (e.g. *High Protein*, *Keto Friendly*, *Gluten-Free*, *Heart Healthy*).
   * **Itemized Ingredients**: Detailed breakdown of every component with portion weight and individual macros.

5. **💬 Ask AI Nutritionist (/api/ask)**:
   * Ask follow-up questions directly about the meal (e.g., *"Is this good for fat loss?"*, *"How can I add more protein?"*, *"What should I eat next?"*).
   * Powered by Google Gemini Flash-Lite with dedicated contextual system prompt.

6. **📅 Daily Meal Tracker**:
   * Tap **"Log to Today's Tracker"** to save meals to today's log.
   * Tap the **🔥 [Cals] kcal** pill in the top header to view today's breakfast, lunch, dinner, and total progress against daily calorie and protein goals.

7. **📤 Native Web Share**:
   * Share full nutritional breakdown via the native iOS share sheet (Messages, Notes, WhatsApp, or Clipboard).

8. **🕒 Scan History**:
   * Chronological history of all scanned meals with thumbnails and timestamps stored in `localStorage`.

---

## 📁 Project Structure

```text
Google API Demo Website/
├── functions/        # Cloudflare Pages Functions (Serverless Edge Backend)
│   └── api/
│       ├── analyze.js# Serverless endpoint: /api/analyze (Hides API key, calls Gemini)
│       └── ask.js    # Serverless endpoint: /api/ask (AI Nutritionist coach)
├── index.html        # PWA App Shell with iOS Notch/Island styling
├── styles.css        # OLED dark-mode design system & native iOS animations
├── app.js            # Image compression, portion scaling, daily tracker, and API handlers
├── manifest.json     # PWA Web App Manifest
├── sw.js             # Service Worker for offline launch & caching
├── server.py         # Local Python server (optional, for local development)
├── samples/          # Sample food images for 1-tap testing
└── icons/            # App icons (192px and 512px)
```
