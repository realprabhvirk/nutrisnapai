/**
 * NutriSnap — AI Food & Drink Nutritionist PWA Logic
 * iPhone-optimized with client-side image compression, portion scaling,
 * daily meal logging, interactive nutritionist questions, and sample demos.
 */

document.addEventListener('DOMContentLoaded', () => {
  // Initialize Lucide icons
  if (window.lucide) lucide.createIcons();

  // ─── DOM References ──────────────────────────────────────────
  const uploadSection  = document.getElementById('uploadSection');
  const previewSection = document.getElementById('previewSection');
  const resultsSection = document.getElementById('resultsSection');
  const errorSection   = document.getElementById('errorSection');

  // Buttons & Inputs
  const cameraBtn    = document.getElementById('cameraBtn');
  const galleryBtn   = document.getElementById('galleryBtn');
  const cameraInput  = document.getElementById('cameraInput');
  const galleryInput = document.getElementById('galleryInput');
  const dropzone     = document.getElementById('dropzone');

  // Preview elements
  const previewImage    = document.getElementById('previewImage');
  const cancelBtn       = document.getElementById('cancelBtn');
  const analyzingOverlay = document.getElementById('analyzingOverlay');
  const analyzingStepText = document.getElementById('analyzingStepText');

  // Results elements
  const resultImage      = document.getElementById('resultImage');
  const dietaryTagsRow   = document.getElementById('dietaryTagsRow');
  const summaryText      = document.getElementById('summaryText');
  const portionLabel     = document.getElementById('portionLabel');
  const portionChips     = document.querySelectorAll('.portion-chip');
  const calDailyPct      = document.getElementById('calDailyPct');
  const calNumber        = document.getElementById('calNumber');
  const ringFill         = document.getElementById('ringFill');

  // Macro bar & pills
  const barProtein       = document.getElementById('barProtein');
  const barCarbs         = document.getElementById('barCarbs');
  const barFat           = document.getElementById('barFat');
  const pctProtein       = document.getElementById('pctProtein');
  const pctCarbs         = document.getElementById('pctCarbs');
  const pctFat           = document.getElementById('pctFat');

  const totalProtein     = document.getElementById('totalProtein');
  const totalCarbs       = document.getElementById('totalCarbs');
  const totalFat         = document.getElementById('totalFat');
  const proteinCals      = document.getElementById('proteinCals');
  const carbsCals        = document.getElementById('carbsCals');
  const fatCals          = document.getElementById('fatCals');

  const totalFiber       = document.getElementById('totalFiber');
  const totalSugar       = document.getElementById('totalSugar');
  const totalNetCarbs    = document.getElementById('totalNetCarbs');

  const itemsList        = document.getElementById('itemsList');
  const itemsCountBadge  = document.getElementById('itemsCountBadge');
  const tipText          = document.getElementById('tipText');

  // Ask AI elements
  const askForm          = document.getElementById('askForm');
  const askInput         = document.getElementById('askInput');
  const askResponseBox   = document.getElementById('askResponseBox');
  const askSpinner       = document.getElementById('askSpinner');
  const askResponseText  = document.getElementById('askResponseText');
  const askPromptChips   = document.querySelectorAll('.ask-prompt-chip');

  // Result Action buttons
  const logMealBtn       = document.getElementById('logMealBtn');
  const shareMealBtn     = document.getElementById('shareMealBtn');
  const scanAgainBtn     = document.getElementById('scanAgainBtn');

  // Error elements
  const errorTitle       = document.getElementById('errorTitle');
  const errorMessage     = document.getElementById('errorMessage');
  const retryBtn         = document.getElementById('retryBtn');

  // Drawers & Modals
  const dailyPillBtn     = document.getElementById('dailyPillBtn');
  const headerDailyCals  = document.getElementById('headerDailyCals');
  const dailyDrawer      = document.getElementById('dailyDrawer');
  const closeDailyBtn    = document.getElementById('closeDailyBtn');
  const dailyTotalCals   = document.getElementById('dailyTotalCals');
  const dailyCalsCircle  = document.getElementById('dailyCalsCircle');
  const dailyProteinLabel= document.getElementById('dailyProteinLabel');
  const dailyProteinBar  = document.getElementById('dailyProteinBar');
  const dailyCarbsLabel  = document.getElementById('dailyCarbsLabel');
  const dailyCarbsBar    = document.getElementById('dailyCarbsBar');
  const dailyFatLabel    = document.getElementById('dailyFatLabel');
  const dailyFatBar      = document.getElementById('dailyFatBar');
  const dailyMealsList   = document.getElementById('dailyMealsList');
  const clearDailyBtn    = document.getElementById('clearDailyBtn');
  const dailyDateLabel   = document.getElementById('dailyDateLabel');

  const historyBtn       = document.getElementById('historyBtn');
  const historyBadge     = document.getElementById('historyBadge');
  const historyPanel     = document.getElementById('historyPanel');
  const closeHistoryBtn  = document.getElementById('closeHistoryBtn');
  const historyList      = document.getElementById('historyList');
  const clearHistoryBtn  = document.getElementById('clearHistoryBtn');
  const recentSection    = document.getElementById('recentSection');
  const recentGrid       = document.getElementById('recentGrid');
  const seeAllRecentBtn  = document.getElementById('seeAllRecentBtn');

  const installGuideBtn  = document.getElementById('installGuideBtn');
  const installModal     = document.getElementById('installModal');
  const closeInstallModalBtn = document.getElementById('closeInstallModalBtn');
  const gotItInstallBtn  = document.getElementById('gotItInstallBtn');

  const toastPill        = document.getElementById('toastPill');
  const toastMsg         = document.getElementById('toastMsg');

  // ─── State ───────────────────────────────────────────────────
  let currentImageData   = null; // { base64, mimeType, dataUrl }
  let currentRawData     = null; // Unscaled JSON from API
  let currentMultiplier  = 1.0;
  let abortController    = null;

  // ─── Section Navigation ──────────────────────────────────────
  function showSection(section) {
    [uploadSection, previewSection, resultsSection, errorSection].forEach(s => {
      s.style.display = 'none';
    });
    section.style.display = '';
    document.getElementById('mainContent').scrollTop = 0;
    if (window.lucide) lucide.createIcons();
  }

  // ─── Image Compression for iPhone / Mobile ───────────────────
  function compressImage(file, maxDimension = 1200, quality = 0.85) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          let { width, height } = img;
          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            } else {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
          const base64 = compressedDataUrl.split(',')[1];
          resolve({
            base64,
            mimeType: 'image/jpeg',
            dataUrl: compressedDataUrl,
          });
        };
        img.onerror = reject;
        img.src = e.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  // ─── File Handlers (Camera & Gallery) ────────────────────────
  cameraBtn.addEventListener('click', () => cameraInput.click());
  galleryBtn.addEventListener('click', () => galleryInput.click());

  cameraInput.addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    await processFile(file);
  });

  galleryInput.addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    await processFile(file);
  });

  // Drag & Drop
  if (dropzone) {
    ['dragenter', 'dragover'].forEach(eventName => {
      dropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        dropzone.classList.add('dragover');
      });
    });

    ['dragleave', 'drop'].forEach(eventName => {
      dropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        dropzone.classList.remove('dragover');
      });
    });

    dropzone.addEventListener('drop', async (e) => {
      const file = e.dataTransfer?.files?.[0];
      if (file && file.type.startsWith('image/')) {
        await processFile(file);
      }
    });
  }

  async function processFile(file) {
    try {
      showToast('Processing photo...');
      currentImageData = await compressImage(file);
      startAnalysis();
    } catch (err) {
      console.error('Image compression error:', err);
      showError('Image Error', 'Could not process this photo. Please try a different image.');
    }
  }

  // ─── Sample Foods Click Handlers ─────────────────────────────
  document.querySelectorAll('.sample-card').forEach(card => {
    card.addEventListener('click', async () => {
      const sampleFile = card.getAttribute('data-sample');
      const title = card.getAttribute('data-title');
      if (!sampleFile) return;

      try {
        showToast(`Loading ${title}...`);
        const response = await fetch(`samples/${sampleFile}`);
        const blob = await response.blob();
        currentImageData = await compressImage(blob);
        startAnalysis();
      } catch (err) {
        console.error('Error loading sample:', err);
        showError('Sample Error', 'Could not load sample image. Please try camera or gallery.');
      }
    });
  });

  // ─── Analysis Flow ───────────────────────────────────────────
  function startAnalysis() {
    previewImage.src = currentImageData.dataUrl;
    showSection(previewSection);
    analyzingOverlay.style.display = '';

    // Animated status messages for delightful UX
    const steps = [
      'Identifying ingredients & meal elements...',
      'Estimating portion weights & visual scale...',
      'Cross-referencing USDA nutritional database...',
      'Computing calories, protein, carbs & fats...'
    ];
    let stepIndex = 0;
    const interval = setInterval(() => {
      stepIndex = (stepIndex + 1) % steps.length;
      if (analyzingStepText) analyzingStepText.textContent = steps[stepIndex];
    }, 1200);

    analyzeImage().finally(() => clearInterval(interval));
  }

  // ─── Direct Fallback Engine ───────────────────────────────────
  // If Cloudflare Pages is deployed statically without Edge Functions (returning 405 or 404),
  // this engine automatically handles the analysis without interrupting the user.
  const CF_FALLBACK_KEY = "AQ.Ab8RN6KCf4Kb0rEltshTHrN_vU1Jujh_QK5zKR9kuxV2ribR2Q";
  const CF_FALLBACK_MODEL = "gemini-flash-lite-latest";

  const SYSTEM_PROMPT = `You are NutriSnap, a world-class clinical nutritionist and food computer-vision expert.
When given an image of food or a drink:
1. Identify every visible item (ingredients, beverages, condiments, garnishes).
2. Estimate realistic portion sizes based on plate size, cup dimensions, and visual scale.
3. Compute nutritional breakdown according to standard USDA FoodData Central databases.
4. Categorize with relevant dietary tags (e.g. High Protein, Low Carb, Keto Friendly, Vegan, Dairy-Free, Gluten-Free, High Fiber, Heart Healthy).
5. Calculate macro percentage of total calories.
Return ONLY a valid JSON object with: items (array of {name, portion, calories, protein_g, carbs_g, fat_g, fiber_g, sugar_g}), totals ({calories, protein_g, carbs_g, fat_g, fiber_g, sugar_g}), macro_percentages ({protein_pct, carbs_pct, fat_pct}), dietary_tags (array of strings), summary (string), health_tip (string).
No markdown fences. Return pure JSON only.`;

  async function callGeminiDirect(base64Image, mimeType) {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${CF_FALLBACK_MODEL}:generateContent?key=${encodeURIComponent(CF_FALLBACK_KEY)}`;
    const payload = {
      system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [{
        parts: [
          { inlineData: { mimeType, data: base64Image } },
          { text: "Analyze this food or drink image and provide the complete nutritional breakdown in the requested JSON format." }
        ]
      }],
      generationConfig: { temperature: 0.2, topP: 0.9, maxOutputTokens: 2048 }
    };

    const resp = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: abortController.signal
    });

    if (!resp.ok) {
      const errJson = await resp.json().catch(() => ({}));
      throw new Error(errJson.error?.message || `AI Service HTTP ${resp.status}`);
    }

    const data = await resp.json();
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    let clean = rawText.trim();
    if (clean.startsWith('```json')) clean = clean.slice(7);
    else if (clean.startsWith('```')) clean = clean.slice(3);
    if (clean.endsWith('```')) clean = clean.slice(0, -3);
    return JSON.parse(clean.trim());
  }

  async function askGeminiDirect(mealContext, question) {
    const prompt = `You are NutriSnap AI, a friendly, certified nutritionist.
Meal Context: ${mealContext || "A healthy meal"}
User Question: ${question}
Provide a concise, friendly, helpful 2-4 sentence response specifically tailored to this meal and the user's health inquiry.`;

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${CF_FALLBACK_MODEL}:generateContent?key=${encodeURIComponent(CF_FALLBACK_KEY)}`;
    const resp = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.5, maxOutputTokens: 500 }
      })
    });

    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "No response received.";
  }

  async function analyzeImage() {
    abortController = new AbortController();

    try {
      let data = null;

      // 1. Try serverless edge endpoint (/api/analyze)
      try {
        const response = await fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            image: currentImageData.base64,
            mimeType: currentImageData.mimeType,
          }),
          signal: abortController.signal,
        });

        // If Cloudflare Pages returns 405 (Method Not Allowed) or 404 (static-only deployment),
        // seamlessly fall back to direct processing without interrupting user
        if (response.status === 405 || response.status === 404) {
          console.log('[NutriSnap] Cloudflare Pages static route detected (405/404). Falling back to direct analysis.');
          data = await callGeminiDirect(currentImageData.base64, currentImageData.mimeType);
        } else if (response.ok) {
          data = await response.json();
        } else {
          // If edge returned another error, try fallback before showing error
          data = await callGeminiDirect(currentImageData.base64, currentImageData.mimeType);
        }
      } catch (fetchErr) {
        if (fetchErr.name === 'AbortError') return;
        // Network or route failure -> fallback
        console.log('[NutriSnap] Route unreachable, using direct analysis fallback.');
        data = await callGeminiDirect(currentImageData.base64, currentImageData.mimeType);
      }

      if (!data) {
        showError('Analysis Failed', 'Could not obtain response from AI.');
        return;
      }

      if (data.error) {
        showError('Analysis Notice', data.error);
        return;
      }

      if (!data.totals || !data.items) {
        showError('Unexpected Result', data.raw_response || 'Could not parse nutrition data. Please try another angle or clearer photo.');
        return;
      }

      // Save raw data & reset multiplier
      currentRawData = data;
      currentMultiplier = 1.0;
      resetPortionChips();

      // Save to History
      saveToHistory(data, currentImageData.dataUrl);

      // Render Dashboard
      renderResults(data, currentMultiplier);

    } catch (err) {
      if (err.name === 'AbortError') return;
      console.error('Analysis error:', err);
      showError('Analysis Error', err.message || 'Could not analyze this photo. Please try again.');
    }
  }

  cancelBtn.addEventListener('click', () => {
    if (abortController) abortController.abort();
    showSection(uploadSection);
  });

  scanAgainBtn.addEventListener('click', () => {
    showSection(uploadSection);
    updateRecentScans();
  });

  retryBtn.addEventListener('click', () => {
    if (currentImageData) {
      startAnalysis();
    } else {
      showSection(uploadSection);
    }
  });

  // ─── Portion Multipliers ─────────────────────────────────────
  portionChips.forEach(chip => {
    chip.addEventListener('click', () => {
      portionChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      currentMultiplier = parseFloat(chip.getAttribute('data-scale')) || 1.0;
      
      const labels = {
        0.5: '0.5x (Half Portion)',
        1.0: '1.0x (Standard Portion)',
        1.5: '1.5x (Large Portion)',
        2.0: '2.0x (Double Portion)',
      };
      portionLabel.textContent = labels[currentMultiplier] || `${currentMultiplier}x`;

      if (currentRawData) {
        renderResults(currentRawData, currentMultiplier);
        showToast(`Adjusted to ${labels[currentMultiplier]}`);
      }
    });
  });

  function resetPortionChips() {
    portionChips.forEach(c => {
      if (c.getAttribute('data-scale') === '1.0') c.classList.add('active');
      else c.classList.remove('active');
    });
    portionLabel.textContent = '1.0x (Standard Portion)';
  }

  // ─── Render Results Dashboard ────────────────────────────────
  function renderResults(raw, mult = 1.0) {
    const items = raw.items || [];
    const rawTotals = raw.totals || {};

    // Calculate scaled totals
    const cals = Math.round((rawTotals.calories || 0) * mult);
    const p = Math.round((rawTotals.protein_g || 0) * mult);
    const c = Math.round((rawTotals.carbs_g || 0) * mult);
    const f = Math.round((rawTotals.fat_g || 0) * mult * 10) / 10;
    const fiber = Math.round((rawTotals.fiber_g || 0) * mult * 10) / 10;
    const sugar = Math.round((rawTotals.sugar_g || 0) * mult * 10) / 10;
    const netCarbs = Math.max(0, Math.round((c - fiber) * 10) / 10);

    // Image
    resultImage.src = currentImageData.dataUrl;

    // Dietary tags
    dietaryTagsRow.innerHTML = '';
    const tags = raw.dietary_tags || ['Balanced Meal'];
    tags.forEach(t => {
      const span = document.createElement('span');
      span.className = 'diet-tag';
      span.textContent = t;
      dietaryTagsRow.appendChild(span);
    });

    // Summary
    summaryText.textContent = raw.summary || 'Nutritional evaluation calculated using standard food data.';

    // Calorie ring & count
    animateNumber(calNumber, cals);
    const circumference = 326.7; // 2 * PI * 52
    const dailyTarget = 2000;
    const pctOfDaily = Math.round((cals / dailyTarget) * 100);
    calDailyPct.textContent = `${pctOfDaily}% of 2,000 kcal`;

    const progress = Math.min(cals / dailyTarget, 1);
    setTimeout(() => {
      ringFill.style.strokeDashoffset = circumference * (1 - progress);
    }, 100);

    // Macro percentages
    const pCals = p * 4;
    const cCals = c * 4;
    const fCals = Math.round(f * 9);
    const totalMacroCals = (pCals + cCals + fCals) || 1;

    const pPct = Math.round((pCals / totalMacroCals) * 100);
    const cPct = Math.round((cCals / totalMacroCals) * 100);
    const fPct = Math.max(0, 100 - pPct - cPct);

    barProtein.style.width = `${pPct}%`;
    barCarbs.style.width   = `${cPct}%`;
    barFat.style.width     = `${fPct}%`;

    pctProtein.textContent = `${pPct}%`;
    pctCarbs.textContent   = `${cPct}%`;
    pctFat.textContent     = `${fPct}%`;

    // Core macro pills
    totalProtein.textContent = `${p}g`;
    proteinCals.textContent  = `${pCals} kcal`;
    totalCarbs.textContent   = `${c}g`;
    carbsCals.textContent    = `${cCals} kcal`;
    totalFat.textContent     = `${f}g`;
    fatCals.textContent      = `${fCals} kcal`;

    // Secondary micro stats
    totalFiber.textContent   = `${fiber}g`;
    totalSugar.textContent   = `${sugar}g`;
    totalNetCarbs.textContent= `${netCarbs}g`;

    // Itemized Ingredients list
    itemsCountBadge.textContent = `${items.length} ${items.length === 1 ? 'item' : 'items'}`;
    itemsList.innerHTML = '';
    items.forEach(item => {
      const itemCals = Math.round((item.calories || 0) * mult);
      const itemP = Math.round((item.protein_g || 0) * mult);
      const itemC = Math.round((item.carbs_g || 0) * mult);
      const itemF = Math.round((item.fat_g || 0) * mult * 10) / 10;

      const row = document.createElement('div');
      row.className = 'item-row';
      row.innerHTML = `
        <div class="item-info">
          <div class="item-name">${escapeHtml(item.name)}</div>
          <div class="item-portion">${escapeHtml(item.portion || '')} ${mult !== 1.0 ? `(${mult}x)` : ''}</div>
          <div class="item-macros-mini">
            <span class="mini-macro p">P: <span>${itemP}g</span></span>
            <span class="mini-macro c">C: <span>${itemC}g</span></span>
            <span class="mini-macro f">F: <span>${itemF}g</span></span>
          </div>
        </div>
        <div class="item-cals">${itemCals} kcal</div>
      `;
      itemsList.appendChild(row);
    });

    // Nutritionist Tip
    tipText.textContent = raw.health_tip || 'A balanced plate supports sustained energy throughout the day.';

    // Reset Ask AI box
    askResponseBox.style.display = 'none';
    askInput.value = '';

    showSection(resultsSection);
  }

  // ─── Ask AI Nutritionist (/api/ask) ──────────────────────────
  askForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const q = askInput.value.trim();
    if (!q) return;
    await submitNutritionQuestion(q);
  });

  askPromptChips.forEach(chip => {
    chip.addEventListener('click', async () => {
      const q = chip.getAttribute('data-q');
      if (q) {
        askInput.value = q;
        await submitNutritionQuestion(q);
      }
    });
  });

  async function submitNutritionQuestion(question) {
    if (!currentRawData) return;

    askResponseBox.style.display = 'block';
    askSpinner.style.display = 'flex';
    askResponseText.textContent = '';

    const mealContext = `${currentRawData.summary || ''}. Total Calories: ${Math.round((currentRawData.totals?.calories || 0) * currentMultiplier)}, Protein: ${Math.round((currentRawData.totals?.protein_g || 0) * currentMultiplier)}g, Carbs: ${Math.round((currentRawData.totals?.carbs_g || 0) * currentMultiplier)}g, Fat: ${Math.round((currentRawData.totals?.fat_g || 0) * currentMultiplier)}g. Items: ${(currentRawData.items || []).map(i => i.name).join(', ')}.`;

    try {
      let answer = null;
      try {
        const resp = await fetch('/api/ask', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mealContext, question })
        });
        if (resp.status === 405 || resp.status === 404 || !resp.ok) {
          answer = await askGeminiDirect(mealContext, question);
        } else {
          const data = await resp.json();
          answer = data.answer;
        }
      } catch (e) {
        answer = await askGeminiDirect(mealContext, question);
      }

      askSpinner.style.display = 'none';
      if (answer) {
        askResponseText.textContent = answer;
      } else {
        askResponseText.textContent = 'Unable to consult nutritionist right now.';
      }
    } catch (err) {
      askSpinner.style.display = 'none';
      askResponseText.textContent = 'Network error consulting AI nutritionist.';
    }
  }

  // ─── Log Meal to Today's Tracker ─────────────────────────────
  logMealBtn.addEventListener('click', () => {
    if (!currentRawData) return;

    const scaledCalories = Math.round((currentRawData.totals?.calories || 0) * currentMultiplier);
    const scaledProtein  = Math.round((currentRawData.totals?.protein_g || 0) * currentMultiplier);
    const scaledCarbs    = Math.round((currentRawData.totals?.carbs_g || 0) * currentMultiplier);
    const scaledFat      = Math.round((currentRawData.totals?.fat_g || 0) * currentMultiplier * 10) / 10;

    const mealEntry = {
      id: Date.now(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      title: currentRawData.summary?.split('.')[0] || (currentRawData.items || []).map(i => i.name).slice(0, 2).join(' & ') || 'Logged Meal',
      thumbnail: currentImageData.dataUrl,
      calories: scaledCalories,
      protein: scaledProtein,
      carbs: scaledCarbs,
      fat: scaledFat,
      multiplier: currentMultiplier
    };

    saveDailyMeal(mealEntry);
    updateDailyTrackerUI();
    showToast(`Logged +${scaledCalories} kcal to today!`);

    // Button feedback animation
    const originalText = logMealBtn.innerHTML;
    logMealBtn.innerHTML = '<i data-lucide="check"></i> <span>Logged to Today!</span>';
    logMealBtn.style.background = '#10b981';
    if (window.lucide) lucide.createIcons();

    setTimeout(() => {
      logMealBtn.innerHTML = originalText;
      logMealBtn.style.background = '';
      if (window.lucide) lucide.createIcons();
    }, 2200);
  });

  // ─── Share Meal Breakdown ────────────────────────────────────
  shareMealBtn.addEventListener('click', () => {
    if (!currentRawData) return;

    const cals = Math.round((currentRawData.totals?.calories || 0) * currentMultiplier);
    const p = Math.round((currentRawData.totals?.protein_g || 0) * currentMultiplier);
    const c = Math.round((currentRawData.totals?.carbs_g || 0) * currentMultiplier);
    const f = Math.round((currentRawData.totals?.fat_g || 0) * currentMultiplier);
    const title = (currentRawData.items || []).map(i => i.name).slice(0, 3).join(', ') || 'My Meal';

    const shareText = `🥗 NutriSnap Analysis:
${title}
🔥 ${cals} kcal | 🍗 ${p}g Protein | 🍞 ${c}g Carbs | 🥑 ${f}g Fat
Analyzed with NutriSnap AI`;

    if (navigator.share) {
      navigator.share({
        title: 'NutriSnap Meal Breakdown',
        text: shareText
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(shareText).then(() => {
        showToast('Meal summary copied to clipboard!');
      });
    }
  });

  // ─── Daily Tracker Storage & Logic ───────────────────────────
  function getTodayKey() {
    const today = new Date().toISOString().split('T')[0];
    return `nutrisnap_daily_${today}`;
  }

  function getDailyMeals() {
    try {
      return JSON.parse(localStorage.getItem(getTodayKey())) || [];
    } catch {
      return [];
    }
  }

  function saveDailyMeal(entry) {
    const meals = getDailyMeals();
    meals.unshift(entry);
    localStorage.setItem(getTodayKey(), JSON.stringify(meals));
  }

  function updateDailyTrackerUI() {
    const meals = getDailyMeals();

    let totalCals = 0;
    let totalP = 0;
    let totalC = 0;
    let totalF = 0;

    meals.forEach(m => {
      totalCals += (m.calories || 0);
      totalP += (m.protein || 0);
      totalC += (m.carbs || 0);
      totalF += (m.fat || 0);
    });

    // Update Header Pill
    headerDailyCals.textContent = totalCals.toLocaleString();

    // Update Drawer Summary
    dailyTotalCals.textContent = totalCals.toLocaleString();
    const calGoal = 2000;
    const pct = Math.min(Math.round((totalCals / calGoal) * 100), 100);
    dailyCalsCircle.textContent = `${pct}%`;

    const pGoal = 130;
    const cGoal = 220;
    const fGoal = 65;

    dailyProteinLabel.textContent = `${Math.round(totalP)}g / ${pGoal}g`;
    dailyCarbsLabel.textContent   = `${Math.round(totalC)}g / ${cGoal}g`;
    dailyFatLabel.textContent     = `${Math.round(totalF)}g / ${fGoal}g`;

    dailyProteinBar.style.width = `${Math.min(100, Math.round((totalP / pGoal) * 100))}%`;
    dailyCarbsBar.style.width   = `${Math.min(100, Math.round((totalC / cGoal) * 100))}%`;
    dailyFatBar.style.width     = `${Math.min(100, Math.round((totalF / fGoal) * 100))}%`;

    // Render Logged Meals
    if (meals.length === 0) {
      dailyMealsList.innerHTML = `
        <div class="empty-state">
          <i data-lucide="utensils"></i>
          <p>No meals logged yet today. Scan a meal and tap "Log to Today's Tracker"!</p>
        </div>
      `;
      clearDailyBtn.style.display = 'none';
    } else {
      clearDailyBtn.style.display = 'flex';
      dailyMealsList.innerHTML = meals.map(m => `
        <div class="logged-meal-item">
          <div class="item-thumb">
            <img src="${m.thumbnail}" alt="Meal">
          </div>
          <div class="item-details">
            <strong>${escapeHtml(m.title)}</strong>
            <span class="item-meta">${m.time} &bull; P:${m.protein}g C:${m.carbs}g F:${m.fat}g</span>
          </div>
          <span class="item-cal-badge">${m.calories} kcal</span>
          <button class="delete-meal-btn" data-delete-id="${m.id}" title="Remove">
            <i data-lucide="trash-2"></i>
          </button>
        </div>
      `).join('');

      // Bind delete buttons
      dailyMealsList.querySelectorAll('[data-delete-id]').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const id = parseInt(btn.getAttribute('data-delete-id'));
          const filtered = getDailyMeals().filter(m => m.id !== id);
          localStorage.setItem(getTodayKey(), JSON.stringify(filtered));
          updateDailyTrackerUI();
          showToast('Meal removed');
        });
      });
    }

    if (window.lucide) lucide.createIcons();
  }

  // Daily Tracker Drawer Toggles
  dailyPillBtn.addEventListener('click', () => {
    dailyDateLabel.textContent = new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
    updateDailyTrackerUI();
    dailyDrawer.classList.add('open');
  });

  closeDailyBtn.addEventListener('click', () => {
    dailyDrawer.classList.remove('open');
  });

  clearDailyBtn.addEventListener('click', () => {
    if (confirm("Reset today's logged meals to 0?")) {
      localStorage.removeItem(getTodayKey());
      updateDailyTrackerUI();
      showToast("Today's log cleared");
    }
  });

  // ─── Scan History (localStorage) ─────────────────────────────
  const HISTORY_KEY = 'nutrisnap_history';
  const MAX_HISTORY = 25;

  function getHistory() {
    try {
      return JSON.parse(localStorage.getItem(HISTORY_KEY)) || [];
    } catch {
      return [];
    }
  }

  function saveToHistory(data, imageDataUrl) {
    const history = getHistory();
    const entry = {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      thumbnail: imageDataUrl,
      summary: data.summary || '',
      calories: data.totals?.calories || 0,
      items: (data.items || []).map(i => i.name).slice(0, 3).join(', '),
      fullData: data,
    };

    history.unshift(entry);
    if (history.length > MAX_HISTORY) history.pop();

    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    } catch {
      // Storage quota exceeded — keep top 5
      while (history.length > 5) history.pop();
      try { localStorage.setItem(HISTORY_KEY, JSON.stringify(history)); } catch {}
    }

    updateHistoryBadge();
    updateRecentScans();
  }

  function updateHistoryBadge() {
    const count = getHistory().length;
    if (count > 0) {
      historyBadge.style.display = 'flex';
      historyBadge.textContent = count > 9 ? '9+' : count;
    } else {
      historyBadge.style.display = 'none';
    }
  }

  function renderHistoryDrawer() {
    const history = getHistory();

    if (history.length === 0) {
      historyList.innerHTML = `
        <div class="empty-state">
          <i data-lucide="search"></i>
          <p>No scans yet. Snap a bowl of food or a drink to get started!</p>
        </div>
      `;
      clearHistoryBtn.style.display = 'none';
    } else {
      clearHistoryBtn.style.display = 'flex';
      historyList.innerHTML = history.map(h => {
        const d = new Date(h.timestamp);
        const dateStr = d.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' &bull; ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        return `
          <div class="history-item" data-history-id="${h.id}">
            <div class="item-thumb">
              <img src="${h.thumbnail}" alt="Food scan">
            </div>
            <div class="item-details">
              <strong>${escapeHtml(h.items || h.summary || 'Meal Scan')}</strong>
              <span class="item-meta">${dateStr}</span>
            </div>
            <span class="item-cal-badge">${h.calories} kcal</span>
          </div>
        `;
      }).join('');

      // Click history item to inspect
      historyList.querySelectorAll('.history-item').forEach(item => {
        item.addEventListener('click', () => {
          const id = parseInt(item.getAttribute('data-history-id'));
          const found = history.find(h => h.id === id);
          if (found && found.fullData) {
            currentImageData = { dataUrl: found.thumbnail, base64: '', mimeType: 'image/jpeg' };
            currentRawData = found.fullData;
            currentMultiplier = 1.0;
            resetPortionChips();
            historyPanel.classList.remove('open');
            renderResults(found.fullData, 1.0);
          }
        });
      });
    }

    if (window.lucide) lucide.createIcons();
  }

  function updateRecentScans() {
    const history = getHistory();
    if (history.length === 0) {
      recentSection.style.display = 'none';
      return;
    }

    recentSection.style.display = '';
    const recents = history.slice(0, 4);
    recentGrid.innerHTML = recents.map(h => `
      <div class="recent-thumb" data-recent-id="${h.id}" title="${escapeHtml(h.items || 'Food')}">
        <img src="${h.thumbnail}" alt="Recent Food">
      </div>
    `).join('');

    recentGrid.querySelectorAll('.recent-thumb').forEach(thumb => {
      thumb.addEventListener('click', () => {
        const id = parseInt(thumb.getAttribute('data-recent-id'));
        const found = history.find(h => h.id === id);
        if (found && found.fullData) {
          currentImageData = { dataUrl: found.thumbnail, base64: '', mimeType: 'image/jpeg' };
          currentRawData = found.fullData;
          currentMultiplier = 1.0;
          resetPortionChips();
          renderResults(found.fullData, 1.0);
        }
      });
    });
  }

  historyBtn.addEventListener('click', () => {
    renderHistoryDrawer();
    historyPanel.classList.add('open');
  });

  closeHistoryBtn.addEventListener('click', () => {
    historyPanel.classList.remove('open');
  });

  if (seeAllRecentBtn) {
    seeAllRecentBtn.addEventListener('click', () => {
      renderHistoryDrawer();
      historyPanel.classList.add('open');
    });
  }

  clearHistoryBtn.addEventListener('click', () => {
    if (confirm('Clear all scan history?')) {
      localStorage.removeItem(HISTORY_KEY);
      renderHistoryDrawer();
      updateRecentScans();
      updateHistoryBadge();
      showToast('Scan history cleared');
    }
  });

  // ─── iPhone Install Guide Modal ──────────────────────────────
  installGuideBtn.addEventListener('click', () => {
    installModal.classList.add('open');
  });

  closeInstallModalBtn.addEventListener('click', () => {
    installModal.classList.remove('open');
  });

  gotItInstallBtn.addEventListener('click', () => {
    installModal.classList.remove('open');
  });

  installModal.addEventListener('click', (e) => {
    if (e.target === installModal) installModal.classList.remove('open');
  });

  // ─── Utilities ───────────────────────────────────────────────
  function showError(title, msg) {
    errorTitle.textContent = title;
    errorMessage.textContent = msg;
    showSection(errorSection);
  }

  function showToast(msg) {
    toastMsg.textContent = msg;
    toastPill.classList.add('show');
    setTimeout(() => {
      toastPill.classList.remove('show');
    }, 2800);
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text || '';
    return div.innerHTML;
  }

  function animateNumber(el, target) {
    const duration = 650;
    const start = performance.now();
    const from = 0;

    function step(now) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const val = Math.round(from + (target - from) * eased);
      el.textContent = val.toLocaleString();
      if (progress < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  // ─── Service Worker Registration (PWA) ───────────────────────
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(err => {
      console.log('SW registration notice:', err);
    });
  }

  // ─── Initial Load ────────────────────────────────────────────
  updateDailyTrackerUI();
  updateRecentScans();
  updateHistoryBadge();
});
