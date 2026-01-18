const STORAGE_KEYS = ["enabled", "keywords", "dimInsteadOfHide", "matchCreatorToo", "blockedGameIds"];

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalize(s) {
  return (s || "").toLowerCase();
}

function pickCardFromLink(a) {
  let el = a;

  for (let i = 0; i < 10 && el; i++) {
    if (el.matches?.("li, article, [role='listitem'], div")) {
      const gameLinks = el.querySelectorAll('a[href*="/games/"]').length;

      if (gameLinks <= 2) return el;
    }
    el = el.parentElement;
  }

  return a.parentElement || a;
}

function findGameCards(root = document) {
  const links = Array.from(root.querySelectorAll('a[href*="/games/"]'));
  const cards = new Set();

  for (const a of links) {
    const card = pickCardFromLink(a);
    if (!card) continue;

    const count = card.querySelectorAll('a[href*="/games/"]').length;
    if (count > 3) continue;

    cards.add(card);
  }

  return Array.from(cards);
}

function extractTitle(card) {
  const candidates = [
    '[data-testid*="game-title"]',
    '[data-testid*="game-card-title"]',
    '[data-testid*="title"]',
    "h2",
    "h3",
    "a[href*='/games/'] h2",
    "a[href*='/games/'] h3"
  ];

  for (const sel of candidates) {
    const el = card.querySelector(sel);
    const txt = el?.textContent?.trim();
    if (txt && txt.length >= 2 && txt.length <= 140) return txt;
  }

  const a = card.querySelector('a[href*="/games/"]');
  const t = a?.textContent?.trim();
  if (t && t.length >= 2 && t.length <= 140) return t;

  return "";
}

function extractCreator(card) {
  const text = (card.textContent || "").replace(/\s+/g, " ").trim();
  const m = text.match(/\bby\s+([^\n\r•|]{2,40})/i);
  return m ? m[1].trim() : "";
}

function brainrotScore(card, title) {
  let score = 0;

  if (title === title.toUpperCase() && title.length > 6) score += 2;

  if (/[🔥💀😱😈✨💥]/.test(title)) score += 2;

  if (/\d{3,}/.test(title)) score += 1;

  if (/(simulator|baddie|tap|spin|afk|idle|rng)/i.test(title)) score += 1;

  const img = card.querySelector("img");
  if (img && img.naturalWidth && img.naturalHeight) {
    score += 0.5;
  }

  return score;
}

function shouldFilter(title, creator, matchers) {
  const t = normalize(title);
  const c = normalize(creator);

  for (const rx of matchers) {
    if (rx.test(t) || (c && rx.test(c))) return true;
  }
  return false;
}

function applyStyle(card, mode) {
  card.setAttribute("data-brainrot-filtered", "1");

  if (mode === "hide") {
    card.style.display = "none";
  } else {
    card.style.opacity = "0.18";
    card.style.filter = "grayscale(1)";
    card.style.pointerEvents = "none";
  }
}

function clearStyle(card) {
  if (!card.hasAttribute("data-brainrot-filtered")) return;

  card.style.display = "";
  card.style.opacity = "";
  card.style.filter = "";
  card.style.pointerEvents = "";
  card.removeAttribute("data-brainrot-filtered");
}

async function getConfig() {
  const cfg = await chrome.storage.sync.get(STORAGE_KEYS);

  const enabled = cfg.enabled !== false; // default ON
  const keywords = Array.isArray(cfg.keywords) ? cfg.keywords : [];
  const dimInsteadOfHide = !!cfg.dimInsteadOfHide;
  const matchCreatorToo = !!cfg.matchCreatorToo;

  const blockedGameIds = Array.isArray(cfg.blockedGameIds)
    ? cfg.blockedGameIds.map(String)
    : [];

  const matchers = keywords
    .map(k => (k || "").trim())
    .filter(Boolean)
    .map(k => new RegExp(escapeRegExp(k.toLowerCase()), "i"));

  return { enabled, matchers, dimInsteadOfHide, matchCreatorToo, blockedGameIds };
}


let scanTimer = null;

function getGameLink(card) {
  return card.querySelector('a[href*="/games/"]');
}

function extractGameIdFromHref(href) {

  const m = (href || "").match(/\/games\/(\d+)\b/);
  return m ? m[1] : "";
}

function getGameId(card) {
  const a = getGameLink(card);
  const href = a?.getAttribute("href") || "";
  return extractGameIdFromHref(href);
}

async function addBlockedGameId(gameId) {
  if (!gameId) return;

  const { blockedGameIds = [] } = await chrome.storage.sync.get(["blockedGameIds"]);
  const set = new Set((blockedGameIds || []).map(String));
  set.add(String(gameId));

  await chrome.storage.sync.set({ blockedGameIds: Array.from(set) });
}

function ensureHideButton(card) {
  if (card.querySelector("[data-brf-hidebtn='1']")) return;

  const cs = getComputedStyle(card);
  if (cs.position === "static") card.style.position = "relative";

  const btn = document.createElement("button");
  btn.type = "button";
  btn.textContent = "Masquer";
  btn.setAttribute("data-brf-hidebtn", "1");

  btn.style.position = "absolute";
  btn.style.top = "10px";
  btn.style.right = "10px";
  btn.style.zIndex = "9999";
  btn.style.padding = "6px 10px";
  btn.style.borderRadius = "999px";
  btn.style.border = "1px solid rgba(255,255,255,0.25)";
  btn.style.background = "rgba(10,12,16,0.85)";
  btn.style.color = "#fff";
  btn.style.fontSize = "12px";
  btn.style.fontWeight = "800";
  btn.style.cursor = "pointer";
  btn.style.backdropFilter = "blur(6px)";
  btn.style.opacity = "0";
  btn.style.transform = "translateY(-2px)";
  btn.style.transition = "opacity .12s ease, transform .12s ease";

  card.addEventListener("mouseenter", () => {
    btn.style.opacity = "1";
    btn.style.transform = "translateY(0)";
  });
  card.addEventListener("mouseleave", () => {
    btn.style.opacity = "0";
    btn.style.transform = "translateY(-2px)";
  });

  btn.addEventListener("click", async (e) => {
    e.preventDefault();
    e.stopPropagation();

    const gameId = getGameId(card);
    if (!gameId) return;

    await addBlockedGameId(gameId);

    const { dimInsteadOfHide } = await chrome.storage.sync.get(["dimInsteadOfHide"]);
    applyStyle(card, dimInsteadOfHide ? "dim" : "hide");

  });

  card.appendChild(btn);
}

async function scanAndFilter() {
  const { enabled, matchers, dimInsteadOfHide, matchCreatorToo, blockedGameIds } = await getConfig();
  const blockedSet = new Set(blockedGameIds || []);

  const cards = findGameCards();
  const mode = dimInsteadOfHide ? "dim" : "hide";

  for (const card of cards) ensureHideButton(card);

  if (!enabled) {
    for (const card of cards) clearStyle(card);
    return;
  }

  for (const card of cards) {
    const gameId = getGameId(card);
    if (gameId && blockedSet.has(String(gameId))) {
      applyStyle(card, mode);
      continue;
    }

    const title = extractTitle(card);
    if (!title) {
      clearStyle(card);
      continue;
    }

    const creator = matchCreatorToo ? extractCreator(card) : "";
    let hit = shouldFilter(title, creator, matchers);

    const score = brainrotScore(card, title);
    if (score >= 3) hit = true;

    if (hit) applyStyle(card, mode);
    else clearStyle(card);
  }
}


const observer = new MutationObserver(() => {
  if (scanTimer) clearTimeout(scanTimer);
  scanTimer = setTimeout(scanAndFilter, 250);
});

function start() {
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true
  });

  scanAndFilter();
}

start();

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "sync") return;
  if (STORAGE_KEYS.some(k => k in changes)) scanAndFilter();
});
