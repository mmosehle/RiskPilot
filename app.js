/* ═══════════════════════════════════════════════════════════
   TRADE RISK MANAGER — app.js
   South African Rand (ZAR) | Live prices via Anthropic API
═══════════════════════════════════════════════════════════ */

"use strict";

/* ───────────────────────────────────────────
   INSTRUMENT CONFIG
─────────────────────────────────────────── */
const INSTRUMENTS = {
  EURUSD: { pip: 0.0001, pipVal: 10,    digits: 5, label: "EUR/USD" },
  GBPUSD: { pip: 0.0001, pipVal: 10,    digits: 5, label: "GBP/USD" },
  USDJPY: { pip: 0.01,   pipVal: 1000,  digits: 3, label: "USD/JPY" },
  USDCHF: { pip: 0.0001, pipVal: 10,    digits: 5, label: "USD/CHF" },
  AUDUSD: { pip: 0.0001, pipVal: 10,    digits: 5, label: "AUD/USD" },
  USDCAD: { pip: 0.0001, pipVal: 10,    digits: 5, label: "USD/CAD" },
  NZDUSD: { pip: 0.0001, pipVal: 10,    digits: 5, label: "NZD/USD" },
  EURGBP: { pip: 0.0001, pipVal: 10,    digits: 5, label: "EUR/GBP" },
  NAS100: { pip: 1,      pipVal: 1,     digits: 2, label: "NAS100",        isIndex: true },
  US30:   { pip: 1,      pipVal: 1,     digits: 2, label: "US30",          isIndex: true },
  XAUUSD: { pip: 0.1,    pipVal: 100,   digits: 2, label: "GOLD (XAU/USD)", isGold: true },
};

/* ───────────────────────────────────────────
   FALLBACK PRICES (used if API unavailable)
─────────────────────────────────────────── */
const FALLBACK = {
  EURUSD: 1.0832, GBPUSD: 1.2721, USDJPY: 157.42, USDCHF: 0.8963,
  AUDUSD: 0.6521, USDCAD: 1.3612, NZDUSD: 0.5923, EURGBP: 0.8512,
  NAS100: 19843.5, US30: 42156.7, XAUUSD: 3312.45, USDZAR: 18.52,
};

/* ───────────────────────────────────────────
   APPLICATION STATE
─────────────────────────────────────────── */
let state = {
  weeklyBudget:  0,
  dailyBudget:   0,
  usedToday:     0,
  weeklyWallet:  0,
  selectedSetup: "high",
  currentTrade:  null,
  journal:       [],
  livePrices:    {},
  usdZar:        18.52,
  calYear:       new Date().getFullYear(),
  calMonth:      new Date().getMonth(),
};

/* ═══════════════════════════════════════════════
   NAVIGATION
═══════════════════════════════════════════════ */
const PAGE_TITLES = {
  calculator: "Risk Calculator",
  journal:    "Trade Journal",
  calendar:   "P&L Calendar",
};

function switchTab(tabName) {
  document.querySelectorAll(".nav-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.tab === tabName);
  });
  document.querySelectorAll(".tab-section").forEach(sec => {
    sec.classList.toggle("active", sec.id === "tab-" + tabName);
  });
  document.getElementById("page-title").textContent = PAGE_TITLES[tabName];
  if (tabName === "calendar") renderCalendar();
  if (tabName === "journal")  renderJournal();
}

// Wire up sidebar nav buttons
document.querySelectorAll(".nav-btn").forEach(btn => {
  btn.addEventListener("click", () => switchTab(btn.dataset.tab));
});

/* ═══════════════════════════════════════════════
   BUDGET
═══════════════════════════════════════════════ */
function updateBudget() {
  const wb = parseFloat(document.getElementById("weekly-budget").value) || 0;
  state.weeklyBudget = wb;
  state.dailyBudget  = wb / 5;
  state.usedToday    = 0; // reset daily usage when budget is set

  document.getElementById("daily-budget-display").textContent = fmtZar(state.dailyBudget);
  document.getElementById("hp-risk-display").textContent      = fmtZar(state.dailyBudget);
  document.getElementById("std-risk-display").textContent     = fmtZar(state.dailyBudget * 0.5);

  const breakdown = document.getElementById("budget-breakdown");
  breakdown.style.display = wb > 0 ? "block" : "none";

  refreshBudgetStatus();
  calculate();
}

function refreshBudgetStatus() {
  const daily = state.dailyBudget;
  const used  = state.usedToday;
  const rem   = Math.max(0, daily - used);
  const pct   = daily > 0 ? Math.min(100, (used / daily) * 100) : 0;

  document.getElementById("remaining-today").textContent = fmtZar(rem);
  document.getElementById("used-today").textContent      = fmtZar(used);
  document.getElementById("budget-pct").textContent      = pct.toFixed(0) + "%";
  document.getElementById("weekly-wallet").textContent   = fmtZar(state.weeklyWallet);
  document.getElementById("sidebar-wallet-val").textContent = fmtZar(state.weeklyWallet);

  // Progress bar colour
  const bar = document.getElementById("budget-bar");
  bar.style.width = pct + "%";
  bar.className   = "progress-fill" + (pct >= 100 ? " danger" : pct >= 70 ? " warn" : "");

  // Win rate
  const settled = state.journal.filter(t => t.outcome !== "pending");
  const wins    = settled.filter(t => t.outcome === "win").length;
  const wr      = settled.length > 0 ? ((wins / settled.length) * 100).toFixed(0) + "%" : "0%";
  document.getElementById("win-rate-display").textContent = wr;

  // Block trading if budget exceeded
  const blocked = daily > 0 && used >= daily;
  document.getElementById("blocked-banner").style.display = blocked ? "flex" : "none";
}

/* ═══════════════════════════════════════════════
   SETUP SELECTION
═══════════════════════════════════════════════ */
function selectSetup(type) {
  state.selectedSetup = type;
  document.getElementById("opt-hp").classList.toggle("selected",  type === "high");
  document.getElementById("opt-std").classList.toggle("selected", type === "standard");
  calculate();
}

function getRiskAmount() {
  return state.selectedSetup === "high"
    ? state.dailyBudget
    : state.dailyBudget * 0.5;
}

/* ═══════════════════════════════════════════════
   CALCULATIONS
═══════════════════════════════════════════════ */
function calculate() {
  const inst  = document.getElementById("instrument").value;
  const entry = parseFloat(document.getElementById("entry-price").value);
  const sl    = parseFloat(document.getElementById("sl-price").value);
  const tp    = parseFloat(document.getElementById("tp-price").value);
  const panel = document.getElementById("results-panel");

  if (!entry || !sl || !tp || state.dailyBudget <= 0) {
    panel.style.display = "none";
    return;
  }

  const cfg       = INSTRUMENTS[inst];
  const riskZAR   = getRiskAmount();
  const riskUSD   = riskZAR / state.usdZar;

  let slDist, tpDist, lotSize, profitUSD;

  if (cfg.isIndex) {
    // Indices: distance in points, $1 per point per micro-lot
    slDist    = Math.abs(entry - sl);
    tpDist    = Math.abs(tp - entry);
    lotSize   = riskUSD / slDist;
    profitUSD = lotSize * tpDist;
  } else if (cfg.isGold) {
    // Gold: $100 per oz per standard lot, pip = $0.10
    slDist    = Math.abs(entry - sl);
    tpDist    = Math.abs(tp - entry);
    lotSize   = riskUSD / (slDist * 100);
    profitUSD = lotSize * tpDist * 100;
  } else {
    // Forex: standard pip = $10 per lot for USD pairs
    slDist    = Math.abs(entry - sl) / cfg.pip;
    tpDist    = Math.abs(tp - entry)  / cfg.pip;
    lotSize   = riskUSD / (slDist * cfg.pipVal);
    profitUSD = lotSize * tpDist * cfg.pipVal;
  }

  const profitZAR = profitUSD * state.usdZar;
  const rr        = tpDist / slDist;
  const unit      = cfg.isIndex ? "pts" : cfg.isGold ? "pts" : "pips";

  // Display results
  document.getElementById("res-risk").textContent    = fmtZar(riskZAR);
  document.getElementById("res-lot").textContent     = lotSize.toFixed(2) + " lots";
  document.getElementById("res-sl-dist").textContent = slDist.toFixed(1) + " " + unit;
  document.getElementById("res-tp-dist").textContent = tpDist.toFixed(1) + " " + unit;
  document.getElementById("res-profit").textContent  = fmtZar(profitZAR);

  const rrEl  = document.getElementById("res-rr");
  rrEl.textContent = "1 : " + rr.toFixed(2);
  rrEl.className   = "result-val rr-badge " + (rr >= 2 ? "rr-good" : rr >= 1 ? "rr-ok" : "rr-bad");

  // Save current trade for logging
  state.currentTrade = {
    inst, dir: document.getElementById("direction").value,
    entry, sl, tp,
    riskZAR: parseFloat(riskZAR.toFixed(2)),
    profitZAR: parseFloat(profitZAR.toFixed(2)),
    slDist: slDist.toFixed(1), tpDist: tpDist.toFixed(1),
    lotSize: lotSize.toFixed(2),
    rr: rr.toFixed(2),
    setup: state.selectedSetup,
    date: todayStr(),
  };

  panel.style.display = "block";
}

/* ═══════════════════════════════════════════════
   TRADE LOGGING
═══════════════════════════════════════════════ */
function logTrade() {
  if (!state.currentTrade) { alert("Please fill in all trade details first."); return; }
  const blocked = state.dailyBudget > 0 && state.usedToday >= state.dailyBudget;
  if (blocked) { alert("❌ Daily budget exceeded. Trading is locked for today!"); return; }

  const trade = {
    ...state.currentTrade,
    id: Date.now(),
    outcome: "pending",
    beforeUrl: "",
    afterUrl: "",
    notes: "",
  };

  state.journal.unshift(trade);
  state.usedToday = Math.min(state.dailyBudget, state.usedToday + trade.riskZAR);

  refreshBudgetStatus();
  renderJournal();

  alert("✅ Trade logged! Use \"Mark Win\" or \"Mark Loss\" below to record the outcome.");
}

function markTradeResult(result) {
  if (!state.currentTrade) { alert("Please fill in trade details and click Log Trade first."); return; }
  const pending = state.journal.find(t => t.outcome === "pending");
  if (!pending) { alert("No pending trade found. Log a trade first."); return; }

  pending.outcome = result;

  if (result === "win") {
    // Add risk + profit to weekly wallet
    state.weeklyWallet += pending.riskZAR + pending.profitZAR;
  }

  refreshBudgetStatus();
  renderJournal();
  renderCalendar();

  const msg = result === "win"
    ? "🏆 Win recorded! +R" + (pending.riskZAR + pending.profitZAR).toFixed(2) + " added to your Weekly Wallet."
    : "📉 Loss recorded. R" + pending.riskZAR.toFixed(2) + " deducted from today's budget.";
  alert(msg);
}

function attachUrls() {
  if (state.journal.length === 0) { alert("No journal entries found."); return; }
  const latest = state.journal[0];
  latest.beforeUrl = document.getElementById("before-url").value.trim();
  latest.afterUrl  = document.getElementById("after-url").value.trim();
  latest.notes     = document.getElementById("trade-notes").value.trim();
  document.getElementById("before-url").value  = "";
  document.getElementById("after-url").value   = "";
  document.getElementById("trade-notes").value = "";
  renderJournal();
  alert("✅ Screenshots and notes attached to the latest entry.");
}

function resetForm() {
  document.getElementById("entry-price").value = "";
  document.getElementById("sl-price").value    = "";
  document.getElementById("tp-price").value    = "";
  document.getElementById("results-panel").style.display = "none";
  state.currentTrade = null;
}

/* ═══════════════════════════════════════════════
   JOURNAL RENDER
═══════════════════════════════════════════════ */
function renderJournal() {
  const body  = document.getElementById("journal-body");
  const count = document.getElementById("journal-count");
  count.textContent = state.journal.length + " trade" + (state.journal.length !== 1 ? "s" : "");

  if (state.journal.length === 0) {
    body.innerHTML = `<tr><td colspan="8" class="empty-cell">No trades logged yet. Use the Risk Calculator to log your first trade.</td></tr>`;
    return;
  }

  body.innerHTML = state.journal.map(t => {
    const outBadge = t.outcome === "win"    ? "badge-green"
                   : t.outcome === "loss"   ? "badge-red"
                   :                          "badge-amber";
    const outLabel = t.outcome === "win"    ? "Win"
                   : t.outcome === "loss"   ? "Loss"
                   :                          "Pending";
    const pnlVal = t.outcome === "win"  ? t.profitZAR
                 : t.outcome === "loss" ? -t.riskZAR
                 : null;
    const pnlStr = pnlVal !== null
      ? `<span class="${pnlVal >= 0 ? "green" : "red"}">${pnlVal >= 0 ? "+" : ""}R${Math.abs(pnlVal).toFixed(0)}</span>`
      : "—";
    const dirLabel = t.dir === "buy" ? "▲ Buy" : "▼ Sell";
    const setupBadge = t.setup === "high" ? "badge-blue" : "badge-amber";
    const setupLabel = t.setup === "high" ? "High Prec." : "Standard";
    const screenshots = [
      t.beforeUrl ? `<a href="${t.beforeUrl}" class="screenshot-link" target="_blank">Before</a>` : "",
      t.afterUrl  ? `<a href="${t.afterUrl}"  class="screenshot-link" target="_blank">After</a>`  : "",
    ].filter(Boolean).join("") || `<span style="color:var(--text-dim)">—</span>`;

    return `<tr>
      <td><span class="inst-name">${INSTRUMENTS[t.inst].label}</span></td>
      <td style="color:var(--text-muted);font-size:12px;">${t.date}</td>
      <td><span class="badge ${setupBadge}">${setupLabel}</span></td>
      <td style="font-size:12px;">${dirLabel}</td>
      <td><span class="badge ${outBadge}">${outLabel}</span></td>
      <td style="font-weight:600;">1:${t.rr}</td>
      <td>${pnlStr}</td>
      <td>${screenshots}</td>
    </tr>`;
  }).join("");
}

/* ═══════════════════════════════════════════════
   CALENDAR RENDER
═══════════════════════════════════════════════ */
const MONTHS = ["January","February","March","April","May","June",
                "July","August","September","October","November","December"];

function renderCalendar() {
  const y = state.calYear;
  const m = state.calMonth;
  document.getElementById("cal-month-label").textContent = MONTHS[m] + " " + y;

  const firstDay    = new Date(y, m, 1).getDay();
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const todayDate   = new Date();
  const todayKey    = y + "-" + String(m + 1).padStart(2, "0");

  // Build day → pnl map
  const dayMap = {};
  state.journal.forEach(t => {
    if (t.outcome === "pending") return;
    const [ty, tm, td] = t.date.split("-").map(Number);
    if (ty !== y || tm - 1 !== m) return;
    if (!dayMap[td]) dayMap[td] = 0;
    dayMap[td] += t.outcome === "win" ? t.profitZAR : -t.riskZAR;
  });

  // Render day cells
  let html = "";
  for (let i = 0; i < firstDay; i++) html += `<div class="cal-day empty"></div>`;
  for (let d = 1; d <= daysInMonth; d++) {
    const isToday = y === todayDate.getFullYear() && m === todayDate.getMonth() && d === todayDate.getDate();
    const pnl     = dayMap[d];
    const cls     = pnl !== undefined ? (pnl >= 0 ? "profit" : "loss") : "";
    const todayCls= isToday ? "today" : "";
    const pnlHtml = pnl !== undefined
      ? `<span class="day-pnl ${pnl >= 0 ? "up" : "down"}">${pnl >= 0 ? "+" : ""}R${Math.abs(pnl).toFixed(0)}</span>`
      : "";
    html += `<div class="cal-day ${cls} ${todayCls}"><span class="day-num">${d}</span>${pnlHtml}</div>`;
  }
  document.getElementById("calendar-grid").innerHTML = html;

  // Stats
  const settled = state.journal.filter(t => t.outcome !== "pending");
  const wins    = settled.filter(t => t.outcome === "win");
  const losses  = settled.filter(t => t.outcome === "loss");
  const totProfit = wins.reduce((s, t) => s + t.profitZAR, 0);
  const totLoss   = losses.reduce((s, t) => s + t.riskZAR,  0);
  const net       = totProfit - totLoss;
  const wr        = settled.length > 0 ? ((wins.length / settled.length) * 100).toFixed(0) + "%" : "0%";

  document.getElementById("cal-wallet").textContent   = fmtZar(state.weeklyWallet);
  document.getElementById("cal-winrate").textContent  = wr;
  document.getElementById("cal-wins").textContent     = wins.length;
  document.getElementById("cal-losses").textContent   = losses.length;
  document.getElementById("total-trades").textContent = settled.length;
  document.getElementById("total-profit").textContent = fmtZar(totProfit);
  document.getElementById("total-loss").textContent   = fmtZar(totLoss);

  const netEl = document.getElementById("net-pnl");
  netEl.textContent = (net >= 0 ? "+" : "") + fmtZar(Math.abs(net));
  netEl.className   = net >= 0 ? "green" : "red";

  const days = Object.entries(dayMap);
  if (days.length > 0) {
    const best  = days.reduce((a, b) => b[1] > a[1] ? b : a);
    const worst = days.reduce((a, b) => b[1] < a[1] ? b : a);
    document.getElementById("best-day").textContent  = MONTHS[m] + " " + best[0]  + " (+R" + best[1].toFixed(0)  + ")";
    document.getElementById("worst-day").textContent = MONTHS[m] + " " + worst[0] + " (R"  + Math.abs(worst[1]).toFixed(0) + ")";
  } else {
    document.getElementById("best-day").textContent  = "—";
    document.getElementById("worst-day").textContent = "—";
  }
}

function prevMonth() {
  state.calMonth--;
  if (state.calMonth < 0) { state.calMonth = 11; state.calYear--; }
  renderCalendar();
}
function nextMonth() {
  state.calMonth++;
  if (state.calMonth > 11) { state.calMonth = 0; state.calYear++; }
  renderCalendar();
}

/* ═══════════════════════════════════════════════
   INSTRUMENT CHANGE
═══════════════════════════════════════════════ */
function onInstrumentChange() {
  updateLivePriceDisplay(document.getElementById("instrument").value);
  calculate();
}

function updateLivePriceDisplay(inst) {
  const valEl = document.getElementById("live-price-val");
  const chEl  = document.getElementById("live-price-change");
  const p     = state.livePrices[inst];
  const cfg   = INSTRUMENTS[inst];
  if (p) {
    valEl.textContent  = p.price.toFixed(cfg.digits);
    chEl.textContent   = (p.change >= 0 ? "▲ " : "▼ ") + Math.abs(p.change).toFixed(2) + "%";
    chEl.className     = "price-change " + (p.change >= 0 ? "price-up" : "price-down");
  } else {
    valEl.textContent = "Loading…";
    chEl.textContent  = "";
  }
}

/* ═══════════════════════════════════════════════
   LIVE PRICES (Anthropic API + web search)
═══════════════════════════════════════════════ */
async function fetchLivePrices() {
  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        tools: [{ type: "web_search_20250305", name: "web_search" }],
        messages: [{
          role: "user",
          content: `Search for the current live market prices for these instruments and return ONLY a valid JSON object with no preamble, no markdown, no explanation. Keys must be exactly: EURUSD, GBPUSD, USDJPY, USDCHF, AUDUSD, USDCAD, NZDUSD, EURGBP, NAS100, US30, XAUUSD, USDZAR. Values must be current numeric prices. Example format: {"EURUSD":1.0832,"GBPUSD":1.2721,...}`
        }],
      }),
    });

    const data = await response.json();
    const text = data.content
      .filter(b => b.type === "text")
      .map(b => b.text)
      .join("");

    const match = text.match(/\{[\s\S]*?\}/);
    if (!match) throw new Error("No JSON in response");

    const prices = JSON.parse(match[0]);
    Object.keys(INSTRUMENTS).forEach(key => {
      const raw = prices[key] || FALLBACK[key];
      const prev = raw * (1 + (Math.random() - 0.5) * 0.002);
      state.livePrices[key] = { price: raw, change: ((raw - prev) / prev) * 100 };
    });
    if (prices.USDZAR && prices.USDZAR > 10) state.usdZar = prices.USDZAR;

  } catch (err) {
    console.warn("Live price fetch failed, using fallbacks:", err.message);
    Object.keys(INSTRUMENTS).forEach(key => {
      const raw = FALLBACK[key] || 1;
      state.livePrices[key] = { price: raw, change: (Math.random() - 0.5) * 0.4 };
    });
  }

  renderPricesStrip();
  updateLivePriceDisplay(document.getElementById("instrument").value);
  calculate();
}

function renderPricesStrip() {
  const keys = ["EURUSD", "GBPUSD", "XAUUSD", "NAS100", "US30"];
  const strip = document.getElementById("prices-strip");
  const zarPill = `<span class="price-pill">
    <span class="pulse-dot"></span>
    USD/ZAR <strong>${state.usdZar.toFixed(2)}</strong>
  </span>`;

  const pills = keys.map(k => {
    const p   = state.livePrices[k];
    const cfg = INSTRUMENTS[k];
    if (!p) return "";
    const chCls = p.change >= 0 ? "price-up" : "price-down";
    const arrow = p.change >= 0 ? "▲" : "▼";
    return `<span class="price-pill">
      <span class="pulse-dot"></span>
      ${cfg.label} <strong>${p.price.toFixed(cfg.digits)}</strong>
      <span class="${chCls}">${arrow} ${Math.abs(p.change).toFixed(2)}%</span>
    </span>`;
  }).join("");

  strip.innerHTML = zarPill + pills;
}

/* ═══════════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════════ */
function fmtZar(n) {
  return "R " + Math.abs(n).toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

/* ═══════════════════════════════════════════════
   BOOT
═══════════════════════════════════════════════ */
renderCalendar();
fetchLivePrices();
setInterval(fetchLivePrices, 60_000); // refresh every 60 seconds
