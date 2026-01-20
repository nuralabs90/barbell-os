const STORE_KEY = "barbell-os:v1";

const MAXIMS = [
  "“Survive volatility. Earn optionality.”",
  "“Avoid ruin. Everything else is tactics.”",
  "“Skin in the game beats opinions.”",
  "“Play long-term games with long-term people.”",
  "“The best trades have limited downside.”",
  "“If it can break you, it’s not worth the upside.”",
  "“Seek convexity. Cap downside. Let upside breathe.”",
  "“You get rich by owning equity—attention is a form of equity.”",
  "“Via negativa: subtract fragility before adding complexity.”",
  "“Compounding is fragile unless you protect the base.”",
];

const els = {
  domain: document.getElementById("domain"),
  safePct: document.getElementById("safePct"),
  safeLabel: document.getElementById("safeLabel"),
  riskLabel: document.getElementById("riskLabel"),
  safeText: document.getElementById("safeText"),
  riskText: document.getElementById("riskText"),
  killText: document.getElementById("killText"),
  generate: document.getElementById("generate"),
  copy: document.getElementById("copy"),
  reset: document.getElementById("reset"),
  output: document.getElementById("output"),
  fragilityScore: document.getElementById("fragilityScore"),
  fragilityLabel: document.getElementById("fragilityLabel"),
  maxim: document.getElementById("maxim"),
};

function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }

function todayStamp(iso) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return "";
  }
}

function load() {
  const raw = localStorage.getItem(STORE_KEY);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

function save(state) {
  localStorage.setItem(STORE_KEY, JSON.stringify(state));
}

function currentState() {
  const safePct = Number(els.safePct.value);
  return {
    domain: els.domain.value,
    safePct,
    riskPct: 100 - safePct,
    safeText: els.safeText.value.trim(),
    riskText: els.riskText.value.trim(),
    killText: els.killText.value.trim(),
    updatedAt: new Date().toISOString(),
  };
}

function applyState(state) {
  els.domain.value = state.domain ?? "Money";
  els.safePct.value = clamp(Number(state.safePct ?? 85), 70, 95);
  els.safeText.value = state.safeText ?? "";
  els.riskText.value = state.riskText ?? "";
  els.killText.value = state.killText ?? "";
  syncPctLabels();
}

function syncPctLabels() {
  const safe = Number(els.safePct.value);
  els.safeLabel.textContent = String(safe);
  els.riskLabel.textContent = String(100 - safe);
}

function wordCount(s) {
  if (!s) return 0;
  return s.split(/\s+/).filter(Boolean).length;
}

function fragilityScore(state) {
  // Simple “operator” heuristic (lower is better):
  // - too much risk allocation increases fragility
  // - no kill list increases fragility
  // - vague safe plan increases fragility
  const risk = state.riskPct;
  const safeWords = wordCount(state.safeText);
  const killWords = wordCount(state.killText);

  let score = 50;
  score += (risk - 15) * 1.2;          // punish risk > 15
  score += safeWords < 8 ? 14 : 0;     // punish vague safe plan
  score += killWords < 6 ? 18 : 0;     // punish missing via negativa
  score = clamp(Math.round(score), 1, 99);

  return score;
}

function scoreBand(score) {
  // lower is better
  if (score <= 33) return { band: "low", label: "Robust" };
  if (score <= 66) return { band: "mid", label: "Neutral" };
  return { band: "high", label: "Fragile" };
}

function pickMaxim() {
  const idx = Math.floor(Math.random() * MAXIMS.length);
  return MAXIMS[idx];
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function toMarkdown(state) {
  return [
    `# Barbell OS — ${state.domain}`,
    ``,
    `**Safe:** ${state.safePct}%`,
    `**Convex:** ${state.riskPct}%`,
    `**Updated:** ${todayStamp(state.updatedAt)}`,
    ``,
    `## SAFE (boring compounding)`,
    state.safeText || "—",
    ``,
    `## CONVEX BETS (optionality)`,
    state.riskText || "—",
    ``,
    `## KILL LIST (via negativa)`,
    state.killText || "—",
    ``,
    `> Maxim: ${els.maxim?.textContent || "Survive volatility. Earn optionality."}`,
    ``,
  ].join("\n");
}

async function copyPlan(state) {
  const md = toMarkdown(state);
  await navigator.clipboard.writeText(md);
}

function setOutputAnimation() {
  // Fade-in micro animation
  els.output.classList.remove("is-ready");
  els.output.classList.add("is-new");
  requestAnimationFrame(() => {
    els.output.classList.remove("is-new");
    els.output.classList.add("is-ready");
  });
}

function render(state) {
  const score = fragilityScore(state);
  const { band, label } = scoreBand(score);

  els.fragilityScore.innerHTML = `<span class="scorePill score-${band}">${score}</span>`;
  els.fragilityLabel.textContent = label;

  els.maxim.textContent = pickMaxim();

  const stamp = todayStamp(state.updatedAt);

  const safe = state.safeText || "—";
  const risk = state.riskText || "—";
  const kill = state.killText || "—";

  els.output.innerHTML = `
    <div class="block">
      <div class="pills">
        <span class="pill">${escapeHtml(state.domain)}</span>
        <span class="pill">Safe ${state.safePct}%</span>
        <span class="pill">Convex ${state.riskPct}%</span>
        <span class="pill">Updated ${escapeHtml(stamp)}</span>
      </div>

      <div>
        <div class="k">SAFE (boring compounding)</div>
        <div class="v">${escapeHtml(safe)}</div>
      </div>

      <div>
        <div class="k">CONVEX BETS (optionality)</div>
        <div class="v">${escapeHtml(risk)}</div>
      </div>

      <div>
        <div class="k">KILL LIST (via negativa)</div>
        <div class="v">${escapeHtml(kill)}</div>
      </div>
    </div>
  `;

  setOutputAnimation();
  els.copy.disabled = false;
}

function resetAll() {
  localStorage.removeItem(STORE_KEY);
  applyState({ domain: "Money", safePct: 85, safeText: "", riskText: "", killText: "" });

  els.output.innerHTML = `<div class="empty muted">Generate to render your plan.</div>`;
  els.fragilityScore.innerHTML = "—";
  els.fragilityLabel.textContent = "";
  els.maxim.textContent = "“Survive volatility. Earn optionality.”";
  els.output.classList.remove("is-new", "is-ready");
  els.copy.disabled = true;
  els.copy.textContent = "Copy";
  els.copy.classList.remove("copied");
}

function boot() {
  syncPctLabels();

  const saved = load();
  if (saved) {
    applyState(saved);
    // If there is meaningful content, render so the plan persists across reloads
    if ((saved.safeText && saved.safeText.trim()) || (saved.riskText && saved.riskText.trim()) || (saved.killText && saved.killText.trim())) {
      render(currentState());
    } else {
      els.fragilityScore.innerHTML = "—";
      els.fragilityLabel.textContent = "";
      els.maxim.textContent = "“Survive volatility. Earn optionality.”";
      els.copy.disabled = true;
    }
  } else {
    els.fragilityScore.innerHTML = "—";
    els.fragilityLabel.textContent = "";
    els.maxim.textContent = "“Survive volatility. Earn optionality.”";
    els.copy.disabled = true;
  }

  els.safePct.addEventListener("input", () => {
    syncPctLabels();
    save(currentState());
  });

  [els.domain, els.safeText, els.riskText, els.killText].forEach((el) => {
    el.addEventListener("input", () => save(currentState()));
    el.addEventListener("change", () => save(currentState()));
  });

  els.generate.addEventListener("click", () => {
    const state = currentState();
    save(state);
    render(state);
  });

  els.copy.addEventListener("click", async () => {
    const state = currentState();
    try {
      await copyPlan(state);
      els.copy.textContent = "Copied";
      els.copy.classList.add("copied");
      setTimeout(() => {
        els.copy.textContent = "Copy";
        els.copy.classList.remove("copied");
      }, 900);
    } catch {
      alert("Copy failed. Clipboard may be blocked on local files. It will work reliably once deployed on GitHub Pages.");
    }
  });

  els.reset.addEventListener("click", () => {
    const ok = confirm("Reset Barbell