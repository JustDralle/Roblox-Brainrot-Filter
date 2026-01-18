const DEFAULTS = [
  "skibidi", "sigma", "rizz", "gyatt", "ohio", "toilet", "brainrot",
  "mewing", "fanum", "alpha", "npc", "simulator", "tap", "rng", "idle", "afk"
];

function uniqNonEmpty(lines) {
  const out = [];
  const seen = new Set();
  for (const l of lines) {
    const v = (l || "").trim();
    if (!v) continue;
    const key = v.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(v);
  }
  return out;
}

function setStatus(msg) {
  const el = document.getElementById("status");
  el.textContent = msg || "";
  if (msg) setTimeout(() => (el.textContent = ""), 1200);
}

function setToggle(el, on) {
  el.classList.toggle("on", !!on);
  el.dataset.on = on ? "1" : "0";
}

function getToggle(el) {
  return el.dataset.on === "1";
}

async function load() {
  const cfg = await chrome.storage.sync.get([
    "enabled", "keywords", "dimInsteadOfHide", "matchCreatorToo"
  ]);

  const enabled = cfg.enabled !== false; // default ON
  const keywords = Array.isArray(cfg.keywords) ? cfg.keywords : DEFAULTS;

  setToggle(document.getElementById("enabledToggle"), enabled);
  document.getElementById("keywords").value = keywords.join("\n");
  document.getElementById("dimInsteadOfHide").checked = !!cfg.dimInsteadOfHide;
  document.getElementById("matchCreatorToo").checked = !!cfg.matchCreatorToo;
}

async function saveEnabled(enabled) {
  await chrome.storage.sync.set({ enabled });
  setStatus(enabled ? "Filtrage activé." : "Filtrage désactivé.");
}

async function applyAll() {
  const raw = document.getElementById("keywords").value.split("\n");
  const keywords = uniqNonEmpty(raw);

  await chrome.storage.sync.set({
    keywords,
    enabled: getToggle(document.getElementById("enabledToggle")),
    dimInsteadOfHide: document.getElementById("dimInsteadOfHide").checked,
    matchCreatorToo: document.getElementById("matchCreatorToo").checked
  });

  setStatus("Appliqué.");
}

document.getElementById("enabledToggle").addEventListener("click", async () => {
  const el = document.getElementById("enabledToggle");
  const next = !getToggle(el);
  setToggle(el, next);
  await saveEnabled(next);
});

document.getElementById("apply").addEventListener("click", applyAll);

document.getElementById("openOptions").addEventListener("click", () => {
  chrome.runtime.openOptionsPage();
});

load();
