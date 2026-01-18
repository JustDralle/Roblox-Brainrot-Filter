const DEFAULTS = [
  "skibidi",
  "sigma",
  "rizz",
  "gyatt",
  "ohio",
  "toilet",
  "brainrot",
  "mewing",
  "fanum"
];

function normLine(s) {
  return s.trim();
}

function uniqNonEmpty(lines) {
  const out = [];
  const seen = new Set();
  for (const l of lines) {
    const v = normLine(l);
    if (!v) continue;
    const key = v.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(v);
  }
  return out;
}

async function load() {
  const { keywords = DEFAULTS, dimInsteadOfHide = false, matchCreatorToo = false } =
    await chrome.storage.sync.get(["keywords", "dimInsteadOfHide", "matchCreatorToo"]);

  document.getElementById("keywords").value = (keywords || []).join("\n");
  document.getElementById("dimInsteadOfHide").checked = !!dimInsteadOfHide;
  document.getElementById("matchCreatorToo").checked = !!matchCreatorToo;
}

function setStatus(msg, ms = 1200) {
  const el = document.getElementById("status");
  el.textContent = msg;
  if (ms > 0) setTimeout(() => (el.textContent = ""), ms);
}

async function save() {
  const raw = document.getElementById("keywords").value.split("\n");
  const keywords = uniqNonEmpty(raw);
  const dimInsteadOfHide = document.getElementById("dimInsteadOfHide").checked;
  const matchCreatorToo = document.getElementById("matchCreatorToo").checked;

  await chrome.storage.sync.set({ keywords, dimInsteadOfHide, matchCreatorToo });
  setStatus("Saved.");
}

async function defaults() {
  document.getElementById("keywords").value = DEFAULTS.join("\n");
  setStatus("Defaults loaded (save it)", 1800);
}

async function clearAll() {
  document.getElementById("keywords").value = "";
  setStatus("Cleared list ! (save it).", 1800);
}

document.getElementById("save").addEventListener("click", save);
document.getElementById("defaults").addEventListener("click", defaults);
document.getElementById("clear").addEventListener("click", clearAll);

load();
