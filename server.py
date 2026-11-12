"""
NutriSnap — Backend API Proxy Server
Hides the Gemini API key from the client. Serves static files and proxies
image analysis requests through /api/analyze and follow-up nutrition queries through /api/ask.
"""

import http.server
import socketserver
import json
import urllib.request
import urllib.error
import socket
import os
import sys
import webbrowser

# ─── Configuration ────────────────────────────────────────────────
PORT = 8000
GEMINI_API_KEY = "AQ.Ab8RN6KCf4Kb0rEltshTHrN_vU1Jujh_QK5zKR9kuxV2ribR2Q"
GEMINI_MODEL = "gemini-flash-lite-latest"
GEMINI_GENERATE_URL = f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent?key={GEMINI_API_KEY}"
STATIC_DIR = os.path.dirname(os.path.abspath(__file__))

SYSTEM_PROMPT = """You are NutriSnap, a world-class clinical nutritionist and food computer-vision expert.
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
- NEVER wrap in markdown code blocks like ```json. Return pure JSON only."""


def get_local_ip():
    """Retrieve the primary local LAN IP address for iPhone connection."""
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(('8.8.8.8', 80))
        ip = s.getsockname()[0]
    except Exception:
        ip = '127.0.0.1'
    finally:
        s.close()
    return ip


class NutriSnapHandler(http.server.SimpleHTTPRequestHandler):
    """Serves static PWA files and handles /api/analyze and /api/ask."""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=STATIC_DIR, **kwargs)

    def end_headers(self):
        # Enable CORS and disable cache during development
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def do_POST(self):
        if self.path == "/api/analyze":
            self._handle_analyze()
        elif self.path == "/api/ask":
            self._handle_ask()
        else:
            self.send_error(404, "Not Found")

    def _handle_analyze(self):
        """Analyze food/drink image via Gemini Vision."""
        try:
            content_length = int(self.headers.get("Content-Length", 0))
            if content_length == 0 or content_length > 25 * 1024 * 1024:
                self._send_json(400, {"error": "Invalid payload size (max 25MB)."})
                return

            body = self.rfile.read(content_length)
            data = json.loads(body.decode("utf-8"))

            image_b64 = data.get("image")
            mime_type = data.get("mimeType", "image/jpeg")

            if not image_b64:
                self._send_json(400, {"error": "Missing 'image' parameter."})
                return

            # Gemini Vision Payload
            gemini_payload = {
                "system_instruction": {
                    "parts": [{"text": SYSTEM_PROMPT}]
                },
                "contents": [
                    {
                        "parts": [
                            {
                                "inlineData": {
                                    "mimeType": mime_type,
                                    "data": image_b64,
                                }
                            },
                            {
                                "text": "Analyze this food or drink image and provide the complete nutritional breakdown in the requested JSON format."
                            },
                        ]
                    }
                ],
                "generationConfig": {
                    "temperature": 0.2,
                    "topP": 0.9,
                    "maxOutputTokens": 2048,
                },
            }

            req = urllib.request.Request(
                GEMINI_GENERATE_URL,
                data=json.dumps(gemini_payload).encode("utf-8"),
                headers={"Content-Type": "application/json"},
            )

            # Resilient fetch with retry
            gemini_response = None
            for attempt in range(2):
                try:
                    with urllib.request.urlopen(req, timeout=35) as resp:
                        gemini_response = json.loads(resp.read().decode("utf-8"))
                    break
                except urllib.error.HTTPError as he:
                    if he.code in (503, 429) and attempt == 0:
                        import time
                        time.sleep(1.5)
                        continue
                    raise

            if not gemini_response:
                self._send_json(502, {"error": "Gemini AI server was unreachable. Please try again."})
                return

            candidates = gemini_response.get("candidates", [])
            if not candidates:
                self._send_json(502, {"error": "No response returned by AI."})
                return

            finish_reason = candidates[0].get("finishReason", "")
            if finish_reason == "SAFETY":
                self._send_json(200, {"error": "Image was flagged by safety filters. Please try a different photo."})
                return

            parts = candidates[0].get("content", {}).get("parts", [])
            raw_text = parts[0].get("text", "") if parts else ""

            # Strip possible markdown code blocks
            clean = raw_text.strip()
            if clean.startswith("```json"):
                clean = clean[7:]
            elif clean.startswith("```"):
                clean = clean[3:]
            if clean.endswith("```"):
                clean = clean[:-3]
            clean = clean.strip()

            try:
                result = json.loads(clean)
            except json.JSONDecodeError:
                result = {"raw_response": raw_text, "error": "Could not format nutritional breakdown. Please try again."}

            self._send_json(200, result)

        except urllib.error.HTTPError as e:
            err_msg = f"HTTP {e.code}"
            try:
                err_data = json.loads(e.read().decode("utf-8"))
                err_msg = err_data.get("error", {}).get("message", err_msg)
            except Exception:
                pass
            print(f"  [API Error] {err_msg}")
            self._send_json(e.code, {"error": f"AI Service error: {err_msg}"})
        except Exception as e:
            print(f"  [Server Error] {e}")
            self._send_json(500, {"error": str(e)})

    def _handle_ask(self):
        """Answer follow-up nutrition or dietary questions about the current meal."""
        try:
            content_length = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(content_length)
            data = json.loads(body.decode("utf-8"))

            meal_context = data.get("mealContext", "")
            question = data.get("question", "")

            if not question:
                self._send_json(400, {"error": "Missing question."})
                return

            ask_prompt = f"""You are NutriSnap AI nutritionist.
Meal Context: {meal_context}

User question: {question}

Provide a concise, friendly, helpful 2-4 sentence response specifically tailored to this meal and the user's health inquiry."""

            payload = {
                "contents": [{"parts": [{"text": ask_prompt}]}],
                "generationConfig": {"temperature": 0.5, "maxOutputTokens": 500}
            }

            req = urllib.request.Request(
                GEMINI_GENERATE_URL,
                data=json.dumps(payload).encode("utf-8"),
                headers={"Content-Type": "application/json"}
            )

            with urllib.request.urlopen(req, timeout=15) as resp:
                res_data = json.loads(resp.read().decode("utf-8"))
                reply = res_data["candidates"][0]["content"]["parts"][0]["text"]
                self._send_json(200, {"answer": reply.strip()})

        except Exception as e:
            self._send_json(500, {"error": str(e)})

    def _send_json(self, status_code, data):
        response_body = json.dumps(data).encode("utf-8")
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(response_body)))
        self.end_headers()
        self.wfile.write(response_body)

    def log_message(self, format, *args):
        first_arg = args[0] if args else ""
        if "/api/" in first_arg:
            print(f"  [API] {first_arg}")


def main():
    os.chdir(STATIC_DIR)
    socketserver.TCPServer.allow_reuse_address = True

    local_ip = get_local_ip()

    with socketserver.TCPServer(("", PORT), NutriSnapHandler) as httpd:
        local_url = f"http://localhost:{PORT}"
        network_url = f"http://{local_ip}:{PORT}"

        print()
        print("  =======================================================")
        print("              NutriSnap -- Food AI Analyzer              ")
        print("                 Optimized for Apple iPhone              ")
        print("  =======================================================")
        print(f"   PC / Local Browser:   {local_url}")
        print(f"   iPhone on Wi-Fi:      {network_url}")
        print("   Gemini Model:         gemini-flash-lite-latest (Cheapest)")
        print("   API Key:              ******** (Protected Server-Side)")
        print("  =======================================================")
        print("   Tip for iPhone:")
        print(f"   1. Connect iPhone to the same Wi-Fi network")
        print(f"   2. Open Safari and navigate to: {network_url}")
        print("   3. Tap Share -> 'Add to Home Screen'")
        print("  =======================================================")
        print("\n  Press Ctrl+C to stop the server.\n")

        try:
            webbrowser.open(local_url)
        except Exception:
            pass

        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n  NutriSnap server stopped. Stay healthy!")
            sys.exit(0)


if __name__ == "__main__":
    main()
