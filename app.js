/**
 * NutriSnap — photo-based meal analysis.
 * Profile, history and daily log are stored in this browser (localStorage).
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

  // Chat elements
  const chatThread       = document.getElementById('chatThread');
  const askForm          = document.getElementById('askForm');
  const askInput         = document.getElementById('askInput');
  const askSubmitBtn     = document.getElementById('askSubmitBtn');
  const askPromptChips   = document.querySelectorAll('.ask-prompt-chip');
  const mealName         = document.getElementById('mealName');

  // Brand / profile elements
  const homeBtn          = document.getElementById('homeBtn');
  const profileBtn       = document.getElementById('profileBtn');
  const profilePanel     = document.getElementById('profilePanel');
  const closeProfileBtn  = document.getElementById('closeProfileBtn');
  const profileNudge     = document.getElementById('profileNudge');
  const pfTarget         = document.getElementById('pfTarget');
  const dailyGoalLabel   = document.getElementById('dailyGoalLabel');

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
  let currentHistoryId   = null;
  let chatLog            = []; // { role: 'user'|'ai', text }

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
      
      currentImageData = await compressImage(file);
      startAnalysis();
    } catch (err) {
      console.error('Image compression error:', err);
      showError('Image Error', 'Could not process this photo. Please try a different image.');
    }
  }

  // ─── Analysis Flow ───────────────────────────────────────────
  function startAnalysis() {
    previewImage.src = currentImageData.dataUrl;
    showSection(previewSection);
    analyzingOverlay.style.display = '';

    const steps = [
      'Reading your photo',
      'Estimating portions',
      'Calculating nutrition',
    ];
    let stepIndex = 0;
    if (analyzingStepText) analyzingStepText.textContent = steps[0];
    const interval = setInterval(() => {
      stepIndex = Math.min(stepIndex + 1, steps.length - 1);
      if (analyzingStepText) analyzingStepText.textContent = steps[stepIndex];
    }, 1800);

    analyzeImage().finally(() => clearInterval(interval));
  }

  async function api(path, payload, signal) {
    const resp = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal,
    });
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok && !data.error) data.error = `Request failed (${resp.status}).`;
    return data;
  }

  async function analyzeImage() {
    abortController = new AbortController();
    try {
      const data = await api('/api/analyze', {
        image: currentImageData.base64,
        mimeType: currentImageData.mimeType,
        profile: profileForAI(),
      }, abortController.signal);

      if (data.error) {
        showError("Couldn't analyze that", data.error);
        return;
      }
      if (!data.totals || !data.items) {
        showError('Unexpected result', 'Could not read the nutrition data. Try another photo.');
        return;
      }

      currentRawData = data;
      currentMultiplier = 1.0;
      resetPortionChips();
      currentHistoryId = saveToHistory(data, currentImageData.dataUrl);
      renderResults(data, currentMultiplier);
    } catch (err) {
      if (err.name === 'AbortError') return;
      console.error('Analysis error:', err);
      showError('Connection problem', 'Could not reach the server. Check your connection and try again.');
    }
  }

  cancelBtn.addEventListener('click', () => {
    if (abortController) abortController.abort();
    goHome();
  });

  scanAgainBtn.addEventListener('click', () => {
    goHome();
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
      
      const labels = { 0.5: '0.5x', 1: '1x', 1.5: '1.5x', 2: '2x' };
      portionLabel.textContent = labels[currentMultiplier] || `${currentMultiplier}x`;

      if (currentRawData) {
        renderResults(currentRawData, currentMultiplier);
      }
    });
  });

  function resetPortionChips() {
    portionChips.forEach(c => {
      if (c.getAttribute('data-scale') === '1.0') c.classList.add('active');
      else c.classList.remove('active');
    });
    portionLabel.textContent = '1x';
  }

  // ─── Render Results Dashboard ────────────────────────────────
  function renderResults(raw, mult = 1.0, opts = {}) {
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
    const tags = raw.dietary_tags || [];
    tags.forEach(t => {
      const span = document.createElement('span');
      span.className = 'diet-tag';
      span.textContent = t;
      dietaryTagsRow.appendChild(span);
    });

    // Summary
    mealName.textContent = raw.meal_name || (raw.items || []).map(i => i.name).slice(0, 2).join(' & ') || 'Your meal';
    summaryText.textContent = raw.summary || '';

    // Calorie ring & count
    animateNumber(calNumber, cals);
    const circumference = 326.7; // 2 * PI * 52
    const dailyTarget = getGoals().cal;
    const pctOfDaily = Math.round((cals / dailyTarget) * 100);
    calDailyPct.textContent = `${pctOfDaily}% of ${dailyTarget.toLocaleString()} kcal goal`;

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
    tipText.textContent = raw.health_tip || '';

    if (!opts.keepChat) {
      chatLog = [];
      chatThread.innerHTML = '';
      askInput.value = '';
      showSection(resultsSection);
    }
  }

  // ─── Nutritionist chat (/api/ask) ────────────────────────────
  function addBubble(role, text, cls = '') {
    const b = document.createElement('div');
    b.className = `bubble ${role} ${cls}`.trim();
    b.textContent = text;
    chatThread.appendChild(b);
    b.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    return b;
  }

  askForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const q = askInput.value.trim();
    if (q) submitNutritionQuestion(q);
  });

  askPromptChips.forEach(chip => {
    chip.addEventListener('click', () => {
      const q = chip.getAttribute('data-q');
      if (q) submitNutritionQuestion(q);
    });
  });

  async function submitNutritionQuestion(question) {
    if (!currentRawData || askSubmitBtn.disabled) return;

    addBubble('user', question);
    askInput.value = '';
    askSubmitBtn.disabled = true;
    const typing = addBubble('ai', 'Thinking…', 'typing');

    try {
      const data = await api('/api/ask', {
        question,
        analysis: currentRawData,
        multiplier: currentMultiplier,
        profile: profileForAI(),
        history: chatLog.slice(-8),
      });
      chatLog.push({ role: 'user', text: question });
      typing.remove();

      if (data.error) {
        addBubble('ai', data.error, 'error');
        return;
      }

      chatLog.push({ role: 'ai', text: data.reply });
      addBubble('ai', data.reply);

      if (data.analysis) {
        currentRawData = data.analysis;
        currentMultiplier = 1.0;
        resetPortionChips();
        updateHistoryEntry(currentHistoryId, data.analysis);
        renderResults(data.analysis, 1.0, { keepChat: true });
        const t = data.analysis.totals || {};
        addBubble('ai', `Updated: ${Math.round(t.calories || 0)} kcal · ${Math.round(t.protein_g || 0)}g protein · ${Math.round(t.carbs_g || 0)}g carbs · ${Math.round(t.fat_g || 0)}g fat`, 'update');
      }
    } catch (err) {
      typing.remove();
      addBubble('ai', 'Could not reach the server. Try again.', 'error');
    } finally {
      askSubmitBtn.disabled = false;
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
      title: currentRawData.meal_name || (currentRawData.items || []).map(i => i.name).slice(0, 2).join(' & ') || 'Meal',
      thumbnail: currentImageData.dataUrl,
      calories: scaledCalories,
      protein: scaledProtein,
      carbs: scaledCarbs,
      fat: scaledFat,
      multiplier: currentMultiplier
    };

    saveDailyMeal(mealEntry);
    updateDailyTrackerUI();
    showToast(`Logged ${scaledCalories} kcal`);

    // Button feedback animation
    const originalText = logMealBtn.innerHTML;
    logMealBtn.innerHTML = '<i data-lucide="check"></i><span>Logged</span>';
    if (window.lucide) lucide.createIcons();
    setTimeout(() => {
      logMealBtn.innerHTML = originalText;
      if (window.lucide) lucide.createIcons();
    }, 2000);
  });

  // ─── Share Meal Breakdown ────────────────────────────────────
  shareMealBtn.addEventListener('click', () => {
    if (!currentRawData) return;

    const cals = Math.round((currentRawData.totals?.calories || 0) * currentMultiplier);
    const p = Math.round((currentRawData.totals?.protein_g || 0) * currentMultiplier);
    const c = Math.round((currentRawData.totals?.carbs_g || 0) * currentMultiplier);
    const f = Math.round((currentRawData.totals?.fat_g || 0) * currentMultiplier);
    const title = currentRawData.meal_name || (currentRawData.items || []).map(i => i.name).slice(0, 3).join(', ') || 'My meal';
    const shareText = `${title}\n${cals} kcal · ${p}g protein · ${c}g carbs · ${f}g fat`;

    if (navigator.share) {
      navigator.share({
        title: 'NutriSnap',
        text: shareText
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(shareText).then(() => {
        showToast('Copied');
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
    const goals = getGoals();
    const calGoal = goals.cal;
    dailyGoalLabel.textContent = `/ ${calGoal.toLocaleString()} kcal`;
    const pct = Math.min(Math.round((totalCals / calGoal) * 100), 100);
    dailyCalsCircle.textContent = `${pct}%`;

    const pGoal = goals.p;
    const cGoal = goals.c;
    const fGoal = goals.f;

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
          <p>Nothing logged yet. Scan a meal and tap Log meal.</p>
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
    if (typeof updateHome === 'function') updateHome();
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
      showToast('Cleared');
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
      meal_name: data.meal_name || '',
      timestamp: new Date().toISOString(),
      thumbnail: imageDataUrl,
      summary: data.summary || '',
      calories: data.totals?.calories || 0,
      items: data.meal_name || (data.items || []).map(i => i.name).slice(0, 3).join(', '),
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
    return entry.id;
  }

  function updateHistoryEntry(id, data) {
    if (!id) return;
    const history = getHistory();
    const h = history.find(x => x.id === id);
    if (!h) return;
    h.summary = data.summary || '';
    h.calories = data.totals?.calories || 0;
    h.items = data.meal_name || (data.items || []).map(i => i.name).slice(0, 3).join(', ');
    h.fullData = data;
    try { localStorage.setItem(HISTORY_KEY, JSON.stringify(history)); } catch {}
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
          <p>No scans yet.</p>
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
              <strong>${escapeHtml(h.items || h.summary || 'Meal')}</strong>
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
            currentHistoryId = found.id;
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
          currentHistoryId = found.id;
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
    if (confirm('Clear all history?')) {
      localStorage.removeItem(HISTORY_KEY);
      renderHistoryDrawer();
      updateRecentScans();
      updateHistoryBadge();
      showToast('History cleared');
    }
  });

  // ─── Profile (saved in localStorage, sent with every request) ─
  const PROFILE_KEY = 'nutrisnap_profile';
  const LB = 2.20462, IN = 0.393701;
  const pf = {
    units: document.getElementById('pfUnits'),
    age: document.getElementById('pfAge'),
    sex: document.getElementById('pfSex'),
    weight: document.getElementById('pfWeight'),
    height: document.getElementById('pfHeight'),
    activity: document.getElementById('pfActivity'),
    goal: document.getElementById('pfGoal'),
    notes: document.getElementById('pfNotes'),
    name: document.getElementById('pfName'),
    wUnit: document.getElementById('pfWeightUnit'),
    hUnit: document.getElementById('pfHeightUnit'),
  };

  function getProfile() {
    try { return JSON.parse(localStorage.getItem(PROFILE_KEY)) || {}; } catch { return {}; }
  }

  function hasProfile(p = getProfile()) {
    return !!(p.age || p.weightKg || p.heightCm || p.goal || p.notes);
  }

  function getGoals() {
    const p = getProfile();
    let cal = 2000, prot = 130;
    if (p.age && p.weightKg && p.heightCm) {
      const base = 10 * p.weightKg + 6.25 * p.heightCm - 5 * p.age + (p.sex === 'male' ? 5 : p.sex === 'female' ? -161 : -78);
      const mult = { sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725 }[p.activity] || 1.375;
      cal = base * mult + (p.goal === 'lose' ? -450 : p.goal === 'gain' ? 300 : 0);
      cal = Math.max(1200, Math.round(cal / 10) * 10);
      prot = Math.round(p.weightKg * (p.goal === 'lose' || p.goal === 'gain' ? 2.0 : 1.6));
    }
    const fat = Math.round((cal * 0.28) / 9);
    const carbs = Math.max(0, Math.round((cal - prot * 4 - fat * 9) / 4));
    return { cal, p: prot, c: carbs, f: fat };
  }

  function profileForAI() {
    const p = getProfile();
    if (!hasProfile(p)) return null;
    return {
      age: p.age || null,
      sex: p.sex || null,
      weight_kg: p.weightKg ? Math.round(p.weightKg * 10) / 10 : null,
      height_cm: p.heightCm ? Math.round(p.heightCm) : null,
      activity: p.activity || null,
      goal: p.goal || null,
      notes: p.notes || null,
      daily_calorie_target: getGoals().cal,
    };
  }

  function fillProfileForm() {
    const p = getProfile();
    const imperial = (p.units || 'imperial') === 'imperial';
    pf.units.value = p.units || 'imperial';
    pf.wUnit.textContent = imperial ? 'lb' : 'kg';
    pf.hUnit.textContent = imperial ? 'in' : 'cm';
    pf.age.value = p.age || '';
    pf.sex.value = p.sex || '';
    pf.weight.value = p.weightKg ? Math.round(p.weightKg * (imperial ? LB : 1) * 10) / 10 : '';
    pf.height.value = p.heightCm ? Math.round(p.heightCm * (imperial ? IN : 1) * 10) / 10 : '';
    pf.activity.value = p.activity || '';
    pf.goal.value = p.goal || '';
    pf.notes.value = p.notes || '';
    pf.name.value = p.name || '';
    renderTarget();
  }

  function saveProfile() {
    const imperial = pf.units.value === 'imperial';
    const w = parseFloat(pf.weight.value), h = parseFloat(pf.height.value), a = parseInt(pf.age.value);
    const p = {
      units: pf.units.value,
      age: a > 0 ? a : null,
      sex: pf.sex.value,
      weightKg: w > 0 ? w / (imperial ? LB : 1) : null,
      heightCm: h > 0 ? h / (imperial ? IN : 1) : null,
      activity: pf.activity.value,
      goal: pf.goal.value,
      notes: pf.notes.value.trim(),
      name: pf.name.value.trim(),
    };
    try { localStorage.setItem(PROFILE_KEY, JSON.stringify(p)); } catch {}
    renderTarget();
    updateDailyTrackerUI();
    updateNudge();
    updateHome();
  }

  function renderTarget() {
    const p = getProfile();
    if (p.age && p.weightKg && p.heightCm) {
      const g = getGoals();
      pfTarget.innerHTML = `<span>Daily target</span><strong>${g.cal.toLocaleString()} kcal</strong><small>${g.p}g protein · ${g.c}g carbs · ${g.f}g fat</small>`;
    } else {
      pfTarget.innerHTML = '<small>Add age, weight and height to get a daily calorie target.</small>';
    }
  }

  function updateNudge() {
    profileNudge.style.display = hasProfile() ? 'none' : '';
  }

  pf.units.addEventListener('change', () => {
    // Re-render displayed values in the newly chosen unit from stored metric values.
    const p = getProfile();
    p.units = pf.units.value;
    try { localStorage.setItem(PROFILE_KEY, JSON.stringify(p)); } catch {}
    fillProfileForm();
  });
  ['name', 'age', 'sex', 'weight', 'height', 'activity', 'goal', 'notes'].forEach(k => {
    pf[k].addEventListener('input', saveProfile);
    pf[k].addEventListener('change', saveProfile);
  });

  function openProfile() {
    fillProfileForm();
    profilePanel.classList.add('open');
  }
  profileBtn.addEventListener('click', openProfile);
  profileNudge.addEventListener('click', openProfile);
  closeProfileBtn.addEventListener('click', () => profilePanel.classList.remove('open'));

  // ─── Home dashboard ──────────────────────────────────────────
  const $ = id => document.getElementById(id);
  function updateHome() {
    const p = getProfile();
    const g = getGoals();
    const meals = getDailyMeals();
    const sum = k => meals.reduce((a, m) => a + (m[k] || 0), 0);
    const eaten = Math.round(sum('calories'));
    const left = g.cal - eaten;

    const hr = new Date().getHours();
    const hello = hr < 12 ? 'Good morning' : hr < 18 ? 'Good afternoon' : 'Good evening';
    $('homeGreeting').textContent = p.name ? `${hello}, ${p.name}` : hello;
    $('homeDate').textContent = new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });

    $('homeRemain').textContent = Math.abs(left).toLocaleString();
    $('homeRemainLabel').textContent = left >= 0 ? 'kcal left' : 'kcal over';
    $('homeEaten').textContent = eaten.toLocaleString();
    $('homeGoal').textContent = g.cal.toLocaleString();
    $('homeMealCount').textContent = meals.length;
    $('homeRing').style.strokeDashoffset = 326.7 * (1 - Math.min(eaten / g.cal, 1));
    $('homeRing').style.stroke = left < 0 ? 'var(--fat)' : '';

    [['P', 'protein', g.p], ['C', 'carbs', g.c], ['F', 'fat', g.f]].forEach(([k, field, goal]) => {
      const v = Math.round(sum(field));
      $(`hm${k}Bar`).style.width = `${Math.min(100, Math.round((v / goal) * 100))}%`;
      $(`hm${k}Val`).textContent = `${v} / ${goal}g`;
    });

    const goalName = { lose: 'Fat loss', gain: 'Building', maintain: 'Maintaining' }[p.goal];
    const tag = $('goalTag');
    tag.textContent = (p.age && p.weightKg && p.heightCm)
      ? `${goalName ? goalName + ' · ' : ''}${g.cal.toLocaleString()} kcal target · Edit`
      : 'Default 2,000 kcal goal · Personalize';

    const sec = $('homeMealsSection');
    if (meals.length) {
      sec.style.display = '';
      $('homeMealsList').innerHTML = meals.slice(0, 3).map(m => `
        <div class="logged-meal-item">
          <div class="item-thumb"><img src="${m.thumbnail}" alt=""></div>
          <div class="item-details">
            <strong>${escapeHtml(m.title)}</strong>
            <span class="item-meta">${m.time} &bull; P:${m.protein}g C:${m.carbs}g F:${m.fat}g</span>
          </div>
          <span class="item-cal-badge">${m.calories} kcal</span>
        </div>`).join('');
    } else {
      sec.style.display = 'none';
    }
  }
  $('goalTag').addEventListener('click', openProfile);
  $('homeViewAll').addEventListener('click', () => $('dailyPillBtn').click());

  // ─── Home ────────────────────────────────────────────────────
  function goHome() {
    if (abortController) abortController.abort();
    [dailyDrawer, historyPanel, profilePanel, installModal].forEach(el => el.classList.remove('open'));
    showSection(uploadSection);
    updateRecentScans();
    updateNudge();
    updateHome();
  }
  homeBtn.addEventListener('click', goHome);

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
  updateNudge();
  updateHome();
});
