// ---------- Content you can personalise ----------
const OUTFITS = [
  {
    id: "candlelight", name: "Candlelight dinner",
    vibe: "Deep wine and warm gold, dressed up for a slow evening.",
    palette: [["Burgundy", "#6D1A36"], ["Champagne", "#E9D8B4"], ["Black", "#1C1C1C"], ["Gold", "#B8873B"]],
    her: "Burgundy satin midi dress, gold drop earrings, nude or black heels.",
    him: "Black suit or blazer, champagne shirt, burgundy pocket square or tie.",
    tip: "His pocket square matches her dress, and we both wear gold.",
  },
  {
    id: "picnic", name: "Golden-hour picnic",
    vibe: "Soft greens and sun-warmed neutrals for an afternoon on the grass.",
    palette: [["Sage", "#9CAF88"], ["Cream", "#F3EBDD"], ["Terracotta", "#C8694A"], ["Tan", "#C9A27E"]],
    her: "Cream sundress, sage cardigan, woven sandals, straw bag.",
    him: "Sage linen shirt, tan chinos, white sneakers.",
    tip: "Sage connects the two looks; terracotta comes in through the blanket or a scarf.",
  },
  {
    id: "movie", name: "Cozy movie night",
    vibe: "Soft knits and comfortable layers, matching without trying too hard.",
    palette: [["Navy", "#22304A"], ["Heather grey", "#A7A9AC"], ["Blush", "#E8B4B8"], ["White", "#FFFFFF"]],
    her: "Blush knit sweater, straight jeans, white sneakers.",
    him: "Navy crewneck, grey jeans or joggers, white sneakers.",
    tip: "Matching white sneakers tie it together; keep everything soft and relaxed.",
  },
  {
    id: "seaside", name: "Seaside walk",
    vibe: "Fresh whites with ocean blue and a pop of coral.",
    palette: [["Ocean", "#2E6F8E"], ["White", "#FFFFFF"], ["Sand", "#E5D3B3"], ["Coral", "#F08A6E"]],
    her: "White linen set, coral lipstick or scarf, flat sandals.",
    him: "Ocean-blue linen shirt, sand shorts or chinos, loafers.",
    tip: "Both wear linen; her coral is the only bright accent.",
  },
  {
    id: "rooftop", name: "Rooftop under the stars",
    vibe: "Midnight tones with a silver shimmer for a night out.",
    palette: [["Midnight", "#1B1F3B"], ["Plum", "#5B2A4E"], ["Silver", "#C0C4CC"], ["Black", "#1A1A1A"]],
    her: "Plum or midnight slip dress, silver jewellery, strappy heels.",
    him: "Midnight-blue shirt, black trousers, silver watch.",
    tip: "Silver on both of you: her jewellery and his watch.",
  },
  {
    id: "cafe", name: "Coffee and bookshop",
    vibe: "Warm browns and olive, like a slow Sunday morning.",
    palette: [["Mocha", "#6F4E37"], ["Oat", "#E8DCC8"], ["Olive", "#6B7045"], ["Ivory", "#FBF8F1"]],
    her: "Oat knit top, olive midi skirt, brown loafers.",
    him: "Mocha overshirt, ivory tee, olive chinos.",
    tip: "Olive appears in both outfits; keep shoes in brown leather.",
  },
];

const CUISINES = [
  { id: "italian", name: "Italian", desc: "Pasta, pizza, tiramisu" },
  { id: "japanese", name: "Japanese", desc: "Sushi, ramen, tempura" },
  { id: "chinese", name: "Chinese", desc: "Dim sum, noodles, hot pot" },
  { id: "thai", name: "Thai", desc: "Curries, pad thai, mango rice" },
  { id: "indian", name: "Indian", desc: "Biryani, tandoori, curries" },
  { id: "korean", name: "Korean", desc: "BBQ, bibimbap, fried chicken" },
  { id: "mexican", name: "Mexican", desc: "Tacos, burritos, churros" },
  { id: "mediterranean", name: "Mediterranean", desc: "Grills, mezze, kebabs" },
  { id: "steak", name: "Steak and grill", desc: "Steaks, burgers, ribs" },
  { id: "seafood", name: "Seafood", desc: "Fish, prawns, crab" },
  { id: "cafe", name: "Café and desserts", desc: "Cakes, waffles, coffee" },
  { id: "street", name: "Street food", desc: "Stalls, snacks, night markets" },
];

// ---------- Helpers ----------
const $ = (id) => document.getElementById(id);
const el = (tag, props = {}, ...children) => {
  const node = Object.assign(document.createElement(tag), props);
  node.append(...children.filter((c) => c !== null && c !== undefined));
  return node;
};
const pad = (n) => String(n).padStart(2, "0");
const isoDay = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parseDay = (s) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
const todayIso = () => isoDay(new Date());

const store = {
  get(key) { try { return localStorage.getItem(key); } catch { return null; } },
  set(key, value) { try { localStorage.setItem(key, value); } catch { /* storage unavailable */ } },
};

async function api(path, options = {}) {
  const res = await fetch(path, {
    ...options,
    headers: options.body instanceof FormData ? undefined : { "Content-Type": "application/json" },
  });
  if (res.status === 401 && path !== "/api/login") {
    showGate();
    throw new Error("Enter the passcode first.");
  }
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Something went wrong (error ${res.status}).`);
  return data;
}

// ---------- State ----------
const state = {
  config: { herName: "Me", hisName: "My love" },
  role: store.get("dp_who") === "him" ? "him" : "her",
  viewMonth: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  selectedDay: null,
  dates: [],
  ballots: {},
  photos: [],
  outfit: OUTFITS[0].id,
};
const myName = () => (state.role === "him" ? state.config.hisName : state.config.herName);
const otherName = () => (state.role === "him" ? state.config.herName : state.config.hisName);

// ---------- Gate ----------
function showGate() {
  $("app").hidden = true;
  $("player").hidden = true;
  $("gate").hidden = false;
  $("passcode").focus();
}

function showApp() {
  $("gate").hidden = true;
  $("app").hidden = false;
}

$("gate-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  $("gate-error").textContent = "";
  const passcode = $("passcode").value;
  if (!passcode) {
    $("gate-error").textContent = "Enter the passcode.";
    return;
  }
  try {
    await api("/api/login", { method: "POST", body: JSON.stringify({ passcode }) });
    state.role = document.querySelector('input[name="who"]:checked').value;
    store.set("dp_who", state.role);
    $("passcode").value = "";
    showApp();
    renderNames();
    await loadAll();
    playSong(); // the "Come in" click lets the browser start the music
  } catch (err) {
    $("gate-error").textContent = err.message;
  }
});
$("passcode").addEventListener("input", () => ($("gate-error").textContent = ""));

function renderNames() {
  const { herName, hisName } = state.config;
  $("who-her").textContent = herName;
  $("who-him").textContent = hisName;
  $("hero-title").textContent = `Take me out, ${hisName}?`;
  $("hero-from").textContent = `from ${herName}, with love`;
  document.title = `Take me out, ${hisName}?`;
  renderWhoSwitch();
}

function renderWhoSwitch() {
  let line = $("whois");
  if (!line) {
    line = el("p", { id: "whois", className: "whois" });
    $("song-form").after(line);
  }
  const btn = el("button", { type: "button", className: "mini", textContent: `Switch to ${otherName()}` });
  btn.addEventListener("click", () => {
    state.role = state.role === "him" ? "her" : "him";
    store.set("dp_who", state.role);
    renderWhoSwitch();
    renderVotes();
  });
  line.replaceChildren(`You're using this as ${myName()}. `, btn);
}

// ---------- Calendar ----------
function renderCalendar() {
  const month = state.viewMonth;
  $("cal-month").textContent = month.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  const daysWithDates = new Set(state.dates.map((d) => d.date));
  const firstWeekday = (month.getDay() + 6) % 7; // Monday first
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const today = todayIso();

  const cells = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(el("span", { className: "day is-blank" }));
  for (let d = 1; d <= daysInMonth; d++) {
    const iso = isoDay(new Date(month.getFullYear(), month.getMonth(), d));
    const btn = el("button", { type: "button", className: "day", textContent: d });
    if (iso < today) btn.classList.add("is-past");
    if (iso === today) btn.classList.add("is-today");
    if (iso === state.selectedDay) btn.classList.add("is-selected");
    if (daysWithDates.has(iso)) btn.classList.add("has-date");
    const label = parseDay(iso).toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" });
    btn.setAttribute("aria-label", daysWithDates.has(iso) ? `${label}, has a date` : label);
    btn.setAttribute("aria-pressed", iso === state.selectedDay);
    btn.addEventListener("click", () => selectDay(iso));
    cells.push(btn);
  }
  $("cal-days").replaceChildren(...cells);
}

function selectDay(iso) {
  state.selectedDay = iso;
  $("date-error").textContent = "";
  const label = parseDay(iso).toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  $("picked-day").replaceChildren("Asking for ", el("strong", { textContent: label }));
  renderCalendar();
  $("d-title").focus();
}

$("cal-prev").addEventListener("click", () => {
  state.viewMonth = new Date(state.viewMonth.getFullYear(), state.viewMonth.getMonth() - 1, 1);
  renderCalendar();
});
$("cal-next").addEventListener("click", () => {
  state.viewMonth = new Date(state.viewMonth.getFullYear(), state.viewMonth.getMonth() + 1, 1);
  renderCalendar();
});

// ---------- Date form and list ----------
function fillOutfitSelect() {
  $("d-outfit").replaceChildren(
    el("option", { value: "", textContent: "Decide later" }),
    ...OUTFITS.map((o) => el("option", { value: o.id, textContent: o.name }))
  );
}

$("date-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  $("date-error").textContent = "";
  const title = $("d-title").value.trim();
  if (!state.selectedDay) { $("date-error").textContent = "Pick a day on the calendar first."; return; }
  if (!title) { $("date-error").textContent = "Give the date a name, like \"Dinner by the river\"."; $("d-title").focus(); return; }

  const btn = $("date-submit");
  btn.disabled = true;
  try {
    const item = await api("/api/dates", {
      method: "POST",
      body: JSON.stringify({
        date: state.selectedDay, title,
        time: $("d-time").value, place: $("d-place").value,
        outfit: $("d-outfit").value, note: $("d-note").value, by: myName(),
      }),
    });
    state.dates.push(item);
    ["d-title", "d-time", "d-place", "d-note"].forEach((id) => ($(id).value = ""));
    $("d-outfit").value = "";
    renderDates();
    renderCalendar();
  } catch (err) {
    $("date-error").textContent = err.message;
  } finally {
    btn.disabled = false;
  }
});
["d-title", "d-place", "d-note"].forEach((id) => $(id).addEventListener("input", () => ($("date-error").textContent = "")));

const STATUS_TEXT = { asked: "Asked", yes: "It's a date", maybe: "Maybe" };

function formatTime(t) {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  return new Date(2000, 0, 1, h, m).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

function renderDates() {
  const today = todayIso();
  const sorted = [...state.dates].sort((a, b) => {
    const aPast = a.date < today, bPast = b.date < today;
    if (aPast !== bPast) return aPast ? 1 : -1; // upcoming first
    return aPast ? (b.date + b.time).localeCompare(a.date + a.time) : (a.date + a.time).localeCompare(b.date + b.time);
  });

  $("date-empty").hidden = sorted.length > 0;
  $("date-list").replaceChildren(...sorted.map((d) => {
    const day = parseDay(d.date);
    const outfit = OUTFITS.find((o) => o.id === d.outfit);
    const meta = [day.toLocaleDateString(undefined, { weekday: "long" }), formatTime(d.time), d.place].filter(Boolean).join(", ");

    const swatches = outfit
      ? el("span", { className: "date-swatches", title: outfit.name },
          ...outfit.palette.map(([name, hex]) => { const s = el("span"); s.style.background = hex; s.title = name; return s; }))
      : null;

    const actions = el("div", { className: "date-actions" });
    if (d.status !== "yes") actions.append(actionButton("Say yes", () => setStatus(d, "yes")));
    if (d.status !== "maybe") actions.append(actionButton("Maybe", () => setStatus(d, "maybe")));
    actions.append(actionButton("Remove", () => removeDate(d)));

    return el("li", { className: `date-item${d.date < today ? " is-past" : ""}` },
      el("div", { className: "date-when" },
        el("span", { className: "date-day", textContent: day.getDate() }),
        el("span", { className: "date-month", textContent: day.toLocaleDateString(undefined, { month: "short", year: "numeric" }) })),
      el("div", {},
        el("div", { className: "date-title", textContent: d.title }),
        el("div", { className: "date-meta" }, meta, outfit ? `, ${outfit.name}` : "", swatches),
        d.note ? el("p", { className: "date-note", textContent: d.note }) : null),
      el("div", { className: "date-side" },
        el("span", { className: `status status-${d.status}`, textContent: STATUS_TEXT[d.status] || "Asked" }),
        actions));
  }));
}

function actionButton(text, onClick) {
  const b = el("button", { type: "button", className: "mini", textContent: text });
  b.addEventListener("click", onClick);
  return b;
}

async function setStatus(d, status) {
  try {
    const updated = await api(`/api/dates/${d.id}`, { method: "PATCH", body: JSON.stringify({ status }) });
    Object.assign(d, updated);
    renderDates();
  } catch (err) { alert(err.message); }
}

async function removeDate(d) {
  if (!confirm(`Remove "${d.title}"?`)) return;
  try {
    await api(`/api/dates/${d.id}`, { method: "DELETE" });
    state.dates = state.dates.filter((x) => x.id !== d.id);
    renderDates();
    renderCalendar();
  } catch (err) { alert(err.message); }
}

// ---------- Outfits ----------
function renderOutfits() {
  $("theme-picker").replaceChildren(...OUTFITS.map((o) => {
    const tab = el("button", { type: "button", className: "theme-tab", textContent: o.name, role: "tab" });
    tab.setAttribute("aria-selected", o.id === state.outfit);
    tab.addEventListener("click", () => { state.outfit = o.id; renderOutfits(); });
    return tab;
  }));

  const o = OUTFITS.find((x) => x.id === state.outfit);
  $("outfit").replaceChildren(
    el("p", { className: "outfit-vibe", textContent: o.vibe }),
    el("div", { className: "palette" }, ...o.palette.map(([name, hex]) => {
      const dot = el("span"); dot.style.background = hex;
      return el("div", { className: "swatch" }, dot, el("span", { textContent: name }));
    })),
    el("div", { className: "looks" },
      el("div", { className: "look" }, el("h4", { textContent: state.config.herName }), el("p", { textContent: o.her })),
      el("div", { className: "look" }, el("h4", { textContent: state.config.hisName }), el("p", { textContent: o.him }))),
    el("p", { className: "tip" }, el("strong", { textContent: "How we match: " }), o.tip)
  );
}

// ---------- Food vote ----------
function tally() {
  const counts = Object.fromEntries(CUISINES.map((c) => [c.id, []]));
  for (const [who, picks] of Object.entries(state.ballots)) {
    for (const id of picks) if (counts[id]) counts[id].push(who);
  }
  return counts;
}

function renderVotes() {
  const counts = tally();
  const mine = new Set(state.ballots[myName()] || []);
  const max = Math.max(0, ...Object.values(counts).map((v) => v.length));
  const winners = max > 0 ? CUISINES.filter((c) => counts[c.id].length === max) : [];

  $("cuisines").replaceChildren(...CUISINES.map((c) => {
    const voters = counts[c.id];
    const btn = el("button", { type: "button", className: "cuisine" },
      el("span", { className: "cuisine-name", textContent: c.name }),
      el("span", { className: "cuisine-desc", textContent: c.desc }),
      el("span", { className: "cuisine-votes", textContent: voters.length ? `${voters.length} vote${voters.length > 1 ? "s" : ""}: ${voters.join(", ")}` : "" }));
    btn.setAttribute("aria-pressed", mine.has(c.id));
    if (winners.includes(c)) btn.classList.add("is-winner");
    btn.addEventListener("click", () => toggleVote(c.id));
    return btn;
  }));

  const result = $("vote-result");
  if (winners.length === 0) {
    result.textContent = "No votes yet. What are you craving?";
  } else if (winners.length === 1) {
    const voterCount = Object.keys(state.ballots).filter((k) => state.ballots[k].length).length;
    result.textContent = max >= 2 && voterCount >= 2 && max === voterCount
      ? `We both want ${winners[0].name}. That's dinner.`
      : `${winners[0].name} is winning with ${max} vote${max > 1 ? "s" : ""}.`;
  } else {
    const names = winners.map((w) => w.name);
    const list = names.length === 2 ? names.join(" or ") : `${names.slice(0, -1).join(", ")} or ${names.at(-1)}`;
    const pick = actionButton("Pick one for us", () => {
      const chosen = names[Math.floor(Math.random() * names.length)];
      result.textContent = `Fate says ${chosen}. That's dinner.`;
    });
    result.replaceChildren(`It's a tie between ${list}.`, pick);
  }
}

async function toggleVote(id) {
  const mine = new Set(state.ballots[myName()] || []);
  mine.has(id) ? mine.delete(id) : mine.add(id);
  try {
    state.ballots = await api("/api/votes", { method: "PUT", body: JSON.stringify({ who: myName(), cuisines: [...mine] }) });
    renderVotes();
  } catch (err) { alert(err.message); }
}

$("vote-reset").addEventListener("click", async () => {
  if (!confirm("Clear everyone's votes and start again?")) return;
  try {
    state.ballots = await api("/api/votes", { method: "DELETE" });
    renderVotes();
  } catch (err) { alert(err.message); }
});

// ---------- Photo board ----------
function renderPhotos() {
  const notes = state.photos.map((p) => {
    const remove = el("button", { type: "button", className: "note-remove", textContent: "×" });
    remove.setAttribute("aria-label", `Remove photo${p.caption ? ` "${p.caption}"` : ""}`);
    remove.addEventListener("click", () => removePhoto(p));

    const img = el("img", { src: `/files/photos/${p.file}`, alt: p.caption || "Our photo", loading: "lazy" });
    const note = el("figure", { className: `note note-${p.color}` },
      el("a", { href: img.src, target: "_blank", rel: "noopener" }, img),
      el("figcaption", {}, p.caption || "", el("span", { className: "note-by", textContent: p.by ? `pinned by ${p.by}` : "" })),
      remove);
    note.style.setProperty("--tilt", `${p.tilt}deg`);
    return note;
  });
  $("cork-empty").hidden = notes.length > 0;
  $("cork").replaceChildren($("cork-empty"), ...notes);
}

$("pin-file").addEventListener("change", () => {
  const file = $("pin-file").files[0];
  $("pin-error").textContent = "";
  $("pin-chosen").textContent = file ? `Ready to pin: ${file.name}` : "";
});

$("pin-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  $("pin-error").textContent = "";
  const file = $("pin-file").files[0];
  if (!file) { $("pin-error").textContent = "Choose a photo first."; return; }
  if (file.size > 10 * 1024 * 1024) { $("pin-error").textContent = "That photo is over 10 MB. Choose a smaller one."; return; }

  const form = new FormData();
  form.append("caption", $("pin-caption").value);
  form.append("by", myName());
  form.append("file", file);

  const btn = $("pin-submit");
  btn.disabled = true;
  btn.textContent = "Pinning…";
  try {
    const photo = await api("/api/photos", { method: "POST", body: form });
    state.photos.unshift(photo);
    $("pin-form").reset();
    $("pin-chosen").textContent = "";
    renderPhotos();
  } catch (err) {
    $("pin-error").textContent = err.message;
  } finally {
    btn.disabled = false;
    btn.textContent = "Pin it";
  }
});

async function removePhoto(p) {
  if (!confirm("Take this photo off the board?")) return;
  try {
    await api(`/api/photos/${p.id}`, { method: "DELETE" });
    state.photos = state.photos.filter((x) => x.id !== p.id);
    renderPhotos();
  } catch (err) { alert(err.message); }
}

// ---------- Our song ----------
const audio = $("audio");

function setSong(song) {
  if (!song) { $("player").hidden = true; return; }
  audio.src = `/files/song/${song.file}`;
  $("player-title").textContent = song.title || "Our song";
  $("player").hidden = false;
}

function playSong() {
  if (!audio.src) return;
  audio.volume = 0.6;
  audio.play().catch(() => { /* browser wants a click first; the record button handles it */ });
}

$("play-btn").addEventListener("click", () => (audio.paused ? playSong() : audio.pause()));
audio.addEventListener("play", () => {
  $("player").classList.add("is-playing");
  $("play-btn").setAttribute("aria-label", "Pause our song");
});
audio.addEventListener("pause", () => {
  $("player").classList.remove("is-playing");
  $("play-btn").setAttribute("aria-label", "Play our song");
});

$("song-file").addEventListener("change", () => {
  const file = $("song-file").files[0];
  $("song-error").textContent = "";
  $("song-file-label").textContent = file ? file.name : "Choose an audio file";
});

$("song-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  $("song-error").textContent = "";
  const file = $("song-file").files[0];
  if (!file) { $("song-error").textContent = "Choose an audio file first (MP3 or M4A)."; return; }
  if (file.size > 25 * 1024 * 1024) { $("song-error").textContent = "That file is over 25 MB. Choose a smaller one."; return; }

  const form = new FormData();
  form.append("title", $("song-title").value);
  form.append("file", file);
  try {
    const song = await api("/api/song", { method: "POST", body: form });
    audio.pause();
    setSong(song);
    $("song-form").reset();
    $("song-file-label").textContent = "Choose an audio file";
    playSong();
  } catch (err) {
    $("song-error").textContent = err.message;
  }
});

// ---------- Start ----------
async function loadAll() {
  const [dates, ballots, photos, song] = await Promise.all([
    api("/api/dates"), api("/api/votes"), api("/api/photos"), api("/api/song"),
  ]);
  Object.assign(state, { dates, ballots, photos });
  renderCalendar();
  renderDates();
  renderOutfits();
  renderVotes();
  renderPhotos();
  setSong(song);
}

(async function init() {
  fillOutfitSelect();
  try {
    state.config = await api("/api/config");
  } catch { /* keep defaults */ }
  renderNames();
  const role = state.role;
  document.querySelector(`input[name="who"][value="${role}"]`).checked = true;

  const { loggedIn } = await api("/api/session").catch(() => ({ loggedIn: false }));
  if (!loggedIn) return showGate();
  showApp();
  try { await loadAll(); } catch (err) { console.error(err); }
})();
