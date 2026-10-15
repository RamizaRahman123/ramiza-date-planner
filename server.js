// Date planner for two: one Express server that serves the page and a small JSON API.
// Data lives in /data (a Docker volume): db.json, uploaded photos, and the song file.

const express = require("express");
const multer = require("multer");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const PORT = Number(process.env.PORT) || 3000;
const DATA_DIR = process.env.DATA_DIR || "/data";
const PASSCODE = process.env.SITE_PASSCODE || "";
const SECRET = process.env.SESSION_SECRET || "";
const HER_NAME = process.env.HER_NAME || "Me";
const HIS_NAME = process.env.HIS_NAME || "My love";

if (!PASSCODE || !SECRET) {
  console.error("SITE_PASSCODE and SESSION_SECRET must be set (see .env.example).");
  process.exit(1);
}

const PHOTO_DIR = path.join(DATA_DIR, "photos");
const SONG_DIR = path.join(DATA_DIR, "song");
const DB_FILE = path.join(DATA_DIR, "db.json");
for (const dir of [DATA_DIR, PHOTO_DIR, SONG_DIR]) fs.mkdirSync(dir, { recursive: true });

// ---------- Tiny JSON "database" ----------
const EMPTY_DB = { dates: [], ballots: {}, photos: [], song: null };

function loadDb() {
  try {
    return { ...EMPTY_DB, ...JSON.parse(fs.readFileSync(DB_FILE, "utf8")) };
  } catch {
    return structuredClone(EMPTY_DB);
  }
}
let db = loadDb();

function saveDb() {
  const tmp = DB_FILE + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2));
  fs.renameSync(tmp, DB_FILE); // atomic replace, so a crash never leaves half a file
}

const newId = () => crypto.randomBytes(8).toString("hex");
const clean = (v, max) => String(v ?? "").trim().slice(0, max);

// ---------- Passcode login (cookie) ----------
const TOKEN = crypto.createHmac("sha256", SECRET).update(PASSCODE).digest("hex");
const COOKIE = "dp_session";

function sameText(a, b) {
  const ha = crypto.createHash("sha256").update(String(a)).digest();
  const hb = crypto.createHash("sha256").update(String(b)).digest();
  return crypto.timingSafeEqual(ha, hb);
}

function readCookie(req, name) {
  const header = req.headers.cookie || "";
  for (const part of header.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === name) return decodeURIComponent(v.join("="));
  }
  return null;
}

function isLoggedIn(req) {
  const value = readCookie(req, COOKIE);
  return Boolean(value) && sameText(value, TOKEN);
}

function requireLogin(req, res, next) {
  if (isLoggedIn(req)) return next();
  res.status(401).json({ error: "Enter the passcode first." });
}

const app = express();
app.set("trust proxy", true);
app.use(express.json({ limit: "20kb" }));

app.get("/health", (req, res) => res.type("text").send("ok\n"));

app.get("/api/config", (req, res) => res.json({ herName: HER_NAME, hisName: HIS_NAME }));

app.get("/api/session", (req, res) => res.json({ loggedIn: isLoggedIn(req) }));

app.post("/api/login", async (req, res) => {
  if (!sameText(req.body?.passcode ?? "", PASSCODE)) {
    await new Promise((r) => setTimeout(r, 600)); // slows down guessing
    return res.status(401).json({ error: "That passcode doesn't match. Try again." });
  }
  const https =
    req.secure ||
    req.headers["x-forwarded-proto"] === "https" ||
    req.headers["cloudfront-forwarded-proto"] === "https";
  const cookie = [
    `${COOKIE}=${TOKEN}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${60 * 60 * 24 * 365}`,
    https ? "Secure" : "",
  ].filter(Boolean);
  res.setHeader("Set-Cookie", cookie.join("; "));
  res.json({ ok: true });
});

// Everything below needs the passcode, including the photo and song files
app.use("/api", requireLogin);
app.use("/files/photos", requireLogin, express.static(PHOTO_DIR, { maxAge: "7d" }));
app.use("/files/song", requireLogin, express.static(SONG_DIR));

// ---------- Dates ----------
app.get("/api/dates", (req, res) => {
  res.json([...db.dates].sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time)));
});

app.post("/api/dates", (req, res) => {
  const date = clean(req.body.date, 10);
  const title = clean(req.body.title, 80);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !title) {
    return res.status(400).json({ error: "Pick a day on the calendar and give the date a name." });
  }
  const item = {
    id: newId(),
    date,
    time: clean(req.body.time, 5),
    title,
    place: clean(req.body.place, 120),
    outfit: clean(req.body.outfit, 40),
    note: clean(req.body.note, 300),
    status: "asked",
    by: clean(req.body.by, 40),
    createdAt: new Date().toISOString(),
  };
  db.dates.push(item);
  saveDb();
  res.status(201).json(item);
});

app.patch("/api/dates/:id", (req, res) => {
  const item = db.dates.find((d) => d.id === req.params.id);
  if (!item) return res.status(404).json({ error: "That date no longer exists." });
  if (["asked", "yes", "maybe"].includes(req.body.status)) item.status = req.body.status;
  saveDb();
  res.json(item);
});

app.delete("/api/dates/:id", (req, res) => {
  db.dates = db.dates.filter((d) => d.id !== req.params.id);
  saveDb();
  res.status(204).end();
});

// ---------- Food votes (each person picks any cuisines they'd enjoy) ----------
app.get("/api/votes", (req, res) => res.json(db.ballots));

app.put("/api/votes", (req, res) => {
  const who = clean(req.body.who, 40);
  const picks = Array.isArray(req.body.cuisines) ? req.body.cuisines : [];
  if (!who) return res.status(400).json({ error: "Choose who you are before voting." });
  db.ballots[who] = [...new Set(picks.map((c) => clean(c, 30)).filter(Boolean))].slice(0, 20);
  saveDb();
  res.json(db.ballots);
});

app.delete("/api/votes", (req, res) => {
  db.ballots = {};
  saveDb();
  res.json(db.ballots);
});

// ---------- Uploads ----------
const IMAGE_TYPES = { "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp", "image/gif": ".gif" };
const AUDIO_TYPES = {
  "audio/mpeg": ".mp3", "audio/mp3": ".mp3", "audio/mp4": ".m4a", "audio/x-m4a": ".m4a",
  "audio/aac": ".aac", "audio/ogg": ".ogg", "audio/wav": ".wav", "audio/x-wav": ".wav",
};

function uploader(dir, types, maxMb) {
  return multer({
    storage: multer.diskStorage({
      destination: dir,
      filename: (req, file, cb) => cb(null, newId() + types[file.mimetype]),
    }),
    limits: { fileSize: maxMb * 1024 * 1024, files: 1 },
    fileFilter: (req, file, cb) => cb(null, Boolean(types[file.mimetype])),
  }).single("file");
}

function handleUpload(upload, label, maxMb) {
  return (req, res, next) =>
    upload(req, res, (err) => {
      if (err?.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({ error: `That ${label} is over ${maxMb} MB. Choose a smaller one.` });
      }
      if (err) return res.status(400).json({ error: `The ${label} couldn't be uploaded.` });
      if (!req.file) return res.status(400).json({ error: `Choose a ${label} file in a supported format.` });
      next();
    });
}

const removeFile = (dir, name) => name && fs.rm(path.join(dir, path.basename(name)), { force: true }, () => {});

// ---------- Photo board ----------
const NOTE_COLORS = ["butter", "rose", "mint", "lilac", "peach"];

app.get("/api/photos", (req, res) => res.json([...db.photos].reverse()));

app.post("/api/photos", handleUpload(uploader(PHOTO_DIR, IMAGE_TYPES, 10), "photo", 10), (req, res) => {
  const photo = {
    id: newId(),
    file: req.file.filename,
    caption: clean(req.body.caption, 80),
    by: clean(req.body.by, 40),
    color: NOTE_COLORS[Math.floor(Math.random() * NOTE_COLORS.length)],
    tilt: Math.round((Math.random() * 8 - 4) * 10) / 10,
    createdAt: new Date().toISOString(),
  };
  db.photos.push(photo);
  saveDb();
  res.status(201).json(photo);
});

app.delete("/api/photos/:id", (req, res) => {
  const photo = db.photos.find((p) => p.id === req.params.id);
  if (photo) removeFile(PHOTO_DIR, photo.file);
  db.photos = db.photos.filter((p) => p.id !== req.params.id);
  saveDb();
  res.status(204).end();
});

// ---------- Our song (you upload your own copy; it is never stored in GitHub) ----------
app.get("/api/song", (req, res) => res.json(db.song));

app.post("/api/song", handleUpload(uploader(SONG_DIR, AUDIO_TYPES, 25), "song", 25), (req, res) => {
  if (db.song) removeFile(SONG_DIR, db.song.file);
  db.song = { file: req.file.filename, title: clean(req.body.title, 80) || "Our song" };
  saveDb();
  res.status(201).json(db.song);
});

// ---------- Page ----------
app.use(express.static(path.join(__dirname, "public")));
app.use((req, res) => res.status(404).json({ error: "Not found" }));

app.listen(PORT, "0.0.0.0", () => console.log(`Date planner listening on port ${PORT}`));
