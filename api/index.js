const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());

// ─── 415 Unsupported Media Type ───────────────────────────────────────────────
// For POST/PUT/PATCH, reject if Content-Type is not application/json
app.use((req, res, next) => {
  const methodsRequiringJson = ["POST", "PUT", "PATCH"];
  if (methodsRequiringJson.includes(req.method)) {
    const ct = req.headers["content-type"] || "";
    if (!ct.includes("application/json")) {
      return res.status(415).json({ message: "Unsupported media type. Please send Content-Type: application/json" });
    }
  }
  next();
});

app.use(express.json());

// ─── 400 Bad Request — malformed JSON body ────────────────────────────────────
app.use((err, req, res, next) => {
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ message: "Bad request. Invalid JSON in request body." });
  }
  next(err);
});

// ─── Rate Limiting (429) ──────────────────────────────────────────────────────
const rateLimitMap = new Map();
const RATE_LIMIT = 60;       // requests per window
const RATE_WINDOW = 60000;   // 1 minute in ms

app.use((req, res, next) => {
  // Skip rate limiting for homepage
  if (req.path === "/") return next();

  const ip = req.ip || req.connection.remoteAddress || "unknown";
  const now = Date.now();
  const entry = rateLimitMap.get(ip) || { count: 0, start: now };

  // Reset window if expired
  if (now - entry.start > RATE_WINDOW) {
    entry.count = 0;
    entry.start = now;
  }

  entry.count++;
  rateLimitMap.set(ip, entry);

  const remaining = Math.max(0, RATE_LIMIT - entry.count);
  const resetSecs = Math.ceil((RATE_WINDOW - (now - entry.start)) / 1000);

  res.set({
    "X-RateLimit-Limit": RATE_LIMIT,
    "X-RateLimit-Remaining": remaining,
    "X-RateLimit-Reset": resetSecs,
  });

  if (entry.count > RATE_LIMIT) {
    return res.status(429).json({
      message: `Too many requests. Limit is ${RATE_LIMIT} requests/minute. Try again in ${resetSecs}s.`,
    });
  }

  next();
});

// ─── Seed Data ────────────────────────────────────────────────────────────────
let users = [
  { id: 1001, name: "Aarav Sharma", email: "aarav.sharma@example.com", gender: "male", status: "active" },
  { id: 1002, name: "Priya Mehta", email: "priya.mehta@example.com", gender: "female", status: "active" },
  { id: 1003, name: "Rohan Verma", email: "rohan.verma@example.com", gender: "male", status: "inactive" },
  { id: 1004, name: "Sneha Iyer", email: "sneha.iyer@example.com", gender: "female", status: "active" },
  { id: 1005, name: "Vikram Nair", email: "vikram.nair@example.com", gender: "male", status: "active" },
  { id: 1006, name: "Kavya Reddy", email: "kavya.reddy@example.com", gender: "female", status: "inactive" },
  { id: 1007, name: "Arjun Patel", email: "arjun.patel@example.com", gender: "male", status: "active" },
  { id: 1008, name: "Nisha Gupta", email: "nisha.gupta@example.com", gender: "female", status: "active" },
  { id: 1009, name: "Ravi Kumar", email: "ravi.kumar@example.com", gender: "male", status: "inactive" },
  { id: 1010, name: "Ananya Singh", email: "ananya.singh@example.com", gender: "female", status: "active" },
  { id: 1011, name: "Karan Joshi", email: "karan.joshi@example.com", gender: "male", status: "active" },
  { id: 1012, name: "Deepika Pillai", email: "deepika.pillai@example.com", gender: "female", status: "inactive" },
  { id: 1013, name: "Suresh Menon", email: "suresh.menon@example.com", gender: "male", status: "active" },
  { id: 1014, name: "Meera Nambiar", email: "meera.nambiar@example.com", gender: "female", status: "active" },
  { id: 1015, name: "Rahul Saxena", email: "rahul.saxena@example.com", gender: "male", status: "inactive" },
  { id: 1016, name: "Pooja Bhatt", email: "pooja.bhatt@example.com", gender: "female", status: "active" },
  { id: 1017, name: "Amit Tiwari", email: "amit.tiwari@example.com", gender: "male", status: "active" },
  { id: 1018, name: "Sunita Rao", email: "sunita.rao@example.com", gender: "female", status: "active" },
  { id: 1019, name: "Nikhil Desai", email: "nikhil.desai@example.com", gender: "male", status: "inactive" },
  { id: 1020, name: "Lakshmi Krishnan", email: "lakshmi.krishnan@example.com", gender: "female", status: "active" },
];

let nextId = 1021;

// ─── Helpers ──────────────────────────────────────────────────────────────────
function validateUser(body, requireAll = true) {
  const errors = [];
  const allowedGenders = ["male", "female"];
  const allowedStatuses = ["active", "inactive"];

  if (requireAll || body.name !== undefined) {
    if (!body.name || typeof body.name !== "string" || body.name.trim() === "") {
      errors.push({ field: "name", message: "can't be blank" });
    }
  }
  if (requireAll || body.email !== undefined) {
    if (!body.email || typeof body.email !== "string" || body.email.trim() === "") {
      errors.push({ field: "email", message: "can't be blank" });
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
      errors.push({ field: "email", message: "is invalid" });
    } else if (users.some((u) => u.email === body.email.toLowerCase())) {
      errors.push({ field: "email", message: "has already been taken" });
    }
  }
  if (requireAll || body.gender !== undefined) {
    if (!body.gender || !allowedGenders.includes(body.gender)) {
      errors.push({ field: "gender", message: "can't be blank, can be male or female" });
    }
  }
  if (requireAll || body.status !== undefined) {
    if (!body.status || !allowedStatuses.includes(body.status)) {
      errors.push({ field: "status", message: "can't be blank, can be active or inactive" });
    }
  }
  return errors;
}

// ─── 401 / 403 Auth Middleware ────────────────────────────────────────────────
// GET all users and GET by ID are public (no token needed)
// POST, PUT, PATCH, DELETE require Authorization: Bearer <token>
// Any token value is accepted — students just need to send the header
const DEMO_TOKENS = new Set(["demo-token", "test-token", "nal-token"]);

app.use("/public/v2/users", (req, res, next) => {
  if (req.method === "GET") return next(); // GET is public

  const authHeader = req.headers["authorization"] || "";

  // 401 — no Authorization header at all
  if (!authHeader) {
    return res.status(401).json({ message: "Authentication failed. Please provide Authorization: Bearer <token> header." });
  }

  // Must be Bearer scheme
  if (!authHeader.toLowerCase().startsWith("bearer ")) {
    return res.status(401).json({ message: "Authentication failed. Use Bearer token scheme." });
  }

  const token = authHeader.split(" ")[1];

  // 403 — token present but explicitly blocked (simulate forbidden)
  if (token === "blocked-token") {
    return res.status(403).json({ message: "Forbidden. This token does not have permission to access this endpoint." });
  }

  // Any other non-empty token is accepted (like GoRest)
  next();
});


app.get("/", (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>GoRest.in — Free Mock REST API for QA & SDET</title>
<meta name="description" content="Free mock REST API for QA and SDET students. Drop-in replacement for GoRest. Full CRUD. JSON & XML. No signup. Built by Naveen AutomationLabs.">
<link rel="icon" type="image/svg+xml" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' rx='18' fill='%2311141c'/><text y='72' x='50' text-anchor='middle' font-size='62' font-family='Georgia,serif' fill='%23e05c3a' font-style='italic'>G</text><text y='88' x='68' text-anchor='middle' font-size='22' font-family='monospace' fill='%2334d399'>.in</text></svg>">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:ital,wght@0,400;0,500;0,600;1,400&family=Fraunces:ital,wght@0,800;0,900;1,700&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..500&display=swap" rel="stylesheet">
<style>
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html { font-size: 15px; scroll-behavior: smooth; }

:root {
  --bg:       #0d1117;
  --bg2:      #161b22;
  --bg3:      #1c2230;
  --border:   #2a3344;
  --border2:  #374151;
  --text:     #e6edf3;
  --text2:    #b0bec8;
  --text3:    #6e7f8d;
  --red:      #e05c3a;
  --red-dim:  #3d1a10;
  --blue:     #4f9cf9;
  --blue-dim: #0f2040;
  --green:    #34d399;
  --green-dim:#0a2e20;
  --amber:    #f59e0b;
  --amber-dim:#2d1f06;
  --mono:  'IBM Plex Mono', monospace;
  --serif: 'Fraunces', Georgia, serif;
  --sans:  'DM Sans', system-ui, sans-serif;
}

body {
  font-family: var(--sans);
  background: var(--bg);
  color: var(--text);
  line-height: 1.6;
  -webkit-font-smoothing: antialiased;
}

/* ─ TOP BAR ─────────────────────────────── */
.topbar {
  background: var(--bg2);
  border-bottom: 1px solid var(--border);
  padding: 9px 40px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-family: var(--mono);
  font-size: 11.5px;
  color: var(--text3);
  letter-spacing: .5px;
}
.topbar-live { display: flex; align-items: center; gap: 8px; color: var(--green); font-weight: 500; }
.live-dot { width: 7px; height: 7px; background: var(--green); border-radius: 50%; animation: blink 2.5s ease-in-out infinite; }
@keyframes blink { 0%,100%{opacity:1} 50%{opacity:.2} }
.topbar-links { display: flex; gap: 20px; }
.topbar-links a { color: var(--text3); text-decoration: none; transition: color .12s; }
.topbar-links a:hover { color: var(--text); }

/* ─ HERO ─────────────────────────────────── */
.hero {
  border-bottom: 1px solid var(--border);
  padding: 72px 48px 64px;
  max-width: 1100px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 5fr 4fr;
  gap: 64px;
  align-items: center;
}
.hero-title {
  font-family: var(--serif);
  font-size: clamp(52px, 6vw, 82px);
  line-height: .92;
  letter-spacing: -2px;
  color: var(--text);
  margin-bottom: 28px;
}
.hero-title .italic { font-style: italic; color: var(--red); }
.hero-desc {
  font-size: 15px;
  color: var(--text2);
  font-weight: 300;
  line-height: 1.8;
  margin-bottom: 28px;
  max-width: 400px;
}
.url-box {
  font-family: var(--mono);
  font-size: 13px;
  background: var(--bg2);
  border: 1px solid var(--border);
  color: var(--green);
  padding: 13px 18px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  gap: 12px;
  overflow-x: auto;
  white-space: nowrap;
  margin-bottom: 20px;
}
.url-label {
  background: var(--red);
  color: #fff;
  font-size: 9.5px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 3px;
  letter-spacing: 1px;
  text-transform: uppercase;
  flex-shrink: 0;
}
.chips { display: flex; flex-wrap: wrap; gap: 8px; }
.chip {
  font-family: var(--mono);
  font-size: 10.5px;
  letter-spacing: .4px;
  color: var(--text3);
  border: 1px solid var(--border);
  border-radius: 3px;
  padding: 4px 10px;
  background: var(--bg2);
}
.postman-btns { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 20px; }
.btn-postman {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-family: var(--mono);
  font-size: 12px;
  font-weight: 500;
  letter-spacing: .3px;
  padding: 9px 18px;
  border-radius: 6px;
  text-decoration: none;
  transition: all .15s;
  background: #ff6c37;
  color: #fff;
  border: 1px solid #e55a28;
}
.btn-postman:hover { background: #e55a28; transform: translateY(-1px); box-shadow: 0 4px 16px rgba(255,108,55,.3); }
.btn-postman.btn-open { background: transparent; color: #ff6c37; border: 1px solid #ff6c37; }
.btn-postman.btn-open:hover { background: rgba(255,108,55,.1); }

/* hero right panel */
.hero-panel {
  background: var(--bg2);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 24px;
}
.panel-title {
  font-family: var(--mono);
  font-size: 10px;
  letter-spacing: 2.5px;
  text-transform: uppercase;
  color: var(--text3);
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--border);
}
.panel-row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  padding: 8px 0;
  border-bottom: 1px solid var(--border);
  font-size: 13px;
}
.panel-row:last-child { border-bottom: none; }
.panel-row .k { color: var(--text3); font-weight: 300; }
.panel-row .v { font-family: var(--mono); font-size: 12px; color: var(--text); }
.panel-row .v.green { color: var(--green); }

/* ─ LAYOUT ───────────────────────────────── */
.wrap { max-width: 1100px; margin: 0 auto; }
.body-grid {
  display: grid;
  grid-template-columns: 180px 1fr;
  border-bottom: 1px solid var(--border);
}
.sidenav {
  border-right: 1px solid var(--border);
  padding: 32px 20px 32px 40px;
  position: sticky;
  top: 0;
  align-self: start;
  height: fit-content;
}
.sidenav-title {
  font-family: var(--mono);
  font-size: 9.5px;
  letter-spacing: 2.5px;
  text-transform: uppercase;
  color: var(--text3);
  margin-bottom: 14px;
}
.sidenav a {
  display: block;
  font-family: var(--mono);
  font-size: 11.5px;
  color: var(--text3);
  text-decoration: none;
  padding: 5px 0;
  border-left: 2px solid transparent;
  padding-left: 8px;
  margin-left: -10px;
  transition: color .12s, border-color .12s;
}
.sidenav a:hover { color: var(--text); border-color: var(--red); }

/* ─ CONTENT ──────────────────────────────── */
.content { padding: 40px 52px 64px; }
.sec { margin-bottom: 60px; }
.sec-head {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 24px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--border);
}
.sec-num { font-family: var(--mono); font-size: 10px; color: var(--border2); letter-spacing: 1px; }
.sec-title {
  font-family: var(--mono);
  font-size: 11px;
  letter-spacing: 3px;
  text-transform: uppercase;
  color: var(--red);
  font-weight: 500;
}

/* ─ ENDPOINT TABLE ───────────────────────── */
.ep { width: 100%; border-collapse: collapse; }
.ep tr { border-bottom: 1px solid var(--border); }
.ep tr:last-child { border-bottom: none; }
.ep tr:hover { background: var(--bg2); }
.ep td { padding: 12px 4px; vertical-align: middle; }
.ep td:nth-child(2) { padding: 0 20px; }
.ep td:nth-child(3) { width: 76px; }
.ep td:nth-child(4) { color: var(--text2); font-size: 13.5px; font-weight: 300; }
.badge {
  font-family: var(--mono);
  font-size: 10.5px;
  font-weight: 600;
  padding: 3px 9px;
  border-radius: 3px;
  display: inline-block;
  text-align: center;
  min-width: 58px;
  letter-spacing: .5px;
}
.GET    { background: var(--green-dim); color: var(--green);  border: 1px solid #1a5c42; }
.POST   { background: var(--blue-dim);  color: var(--blue);   border: 1px solid #1a3a6e; }
.PUT    { background: var(--amber-dim); color: var(--amber);  border: 1px solid #5c3a08; }
.PATCH  { background: #2a1f0a; color: #fb923c; border: 1px solid #5c3a08; }
.DELETE { background: var(--red-dim);   color: #f87171;       border: 1px solid #5c1a10; }
.open { background: var(--green-dim); color: var(--green); border: 1px solid #1a5c42; font-size: 10px; padding: 2px 8px; }
.lock { background: var(--amber-dim); color: var(--amber); border: 1px solid #5c3a08; font-size: 10px; padding: 2px 8px; }
.ep-path { font-family: var(--mono); font-size: 13px; color: var(--text); }

/* ─ CALLOUT ──────────────────────────────── */
.callout {
  border-left: 3px solid var(--red);
  background: var(--bg2);
  border-radius: 0 6px 6px 0;
  padding: 18px 22px;
  border: 1px solid var(--border);
  border-left: 3px solid var(--red);
}
.callout.blue { border-left-color: var(--blue); }
.callout p { font-size: 14px; color: var(--text2); line-height: 1.75; margin-bottom: 10px; font-weight: 300; }
.callout p:last-child { margin: 0; }
.callout strong { color: var(--text); font-weight: 500; }
.callout code {
  font-family: var(--mono);
  font-size: 11.5px;
  background: var(--bg3);
  border: 1px solid var(--border);
  padding: 1px 6px;
  border-radius: 3px;
  color: var(--blue);
}
.callout .warn { color: #f87171; }

/* ─ CODE BLOCKS ──────────────────────────── */
.codeblock { background: var(--bg2); border: 1px solid var(--border); border-radius: 6px; overflow: hidden; margin-bottom: 12px; }
.codeblock-bar {
  background: var(--bg3);
  border-bottom: 1px solid var(--border);
  padding: 7px 16px;
  font-family: var(--mono);
  font-size: 10.5px;
  color: var(--text3);
  letter-spacing: 1px;
  text-transform: uppercase;
  display: flex;
  align-items: center;
  gap: 10px;
}
.codeblock pre {
  padding: 16px 20px;
  font-family: var(--mono);
  font-size: 13px;
  line-height: 1.85;
  color: var(--text2);
  white-space: pre-wrap;
  word-break: break-word;
  overflow-wrap: anywhere;
}
.tok-k   { color: #e2b55e; }
.tok-s   { color: var(--green); }
.tok-n   { color: #d08b5b; }
.tok-c   { color: var(--text3); font-style: italic; }
.tok-cmd { color: var(--blue); }
.tok-f   { color: #7dd3fc; }
.tok-u   { color: var(--green); }
.tok-q   { color: #e2b55e; }

/* ─ SCHEMA BOX ───────────────────────────── */
.schema-box { background: var(--bg2); border: 1px solid var(--border); border-radius: 6px; overflow: hidden; }
.schema-bar { background: var(--bg3); border-bottom: 1px solid var(--border); padding: 8px 18px; font-family: var(--mono); font-size: 10.5px; color: var(--text3); letter-spacing: 1px; text-transform: uppercase; }
.schema-body { padding: 20px 22px; font-family: var(--mono); font-size: 13px; line-height: 1.9; color: var(--text2); }

/* ─ PARAM TABLE ──────────────────────────── */
.ptable { width: 100%; border-collapse: collapse; }
.ptable tr { border-bottom: 1px solid var(--border); }
.ptable tr:last-child { border-bottom: none; }
.ptable tr:hover { background: var(--bg2); }
.ptable td { padding: 11px 4px; font-size: 13.5px; vertical-align: top; }
.ptable td:first-child { font-family: var(--mono); font-size: 12px; color: var(--blue); width: 220px; padding-right: 20px; }
.ptable td:last-child { color: var(--text2); font-weight: 300; }
.ptable code { font-family: var(--mono); font-size: 11.5px; background: var(--bg3); border: 1px solid var(--border); padding: 1px 6px; border-radius: 3px; color: var(--amber); }

/* ─ STATUS TABLE ─────────────────────────── */
.stat-wrap { display: grid; grid-template-columns: 1fr 1fr; border: 1px solid var(--border); border-radius: 6px; overflow: hidden; background: var(--bg2); }
.stat-col { padding: 20px 24px; }
.stat-col + .stat-col { border-left: 1px solid var(--border); }
.stat-col-title { font-family: var(--mono); font-size: 10px; letter-spacing: 2px; text-transform: uppercase; color: var(--text3); padding-bottom: 12px; margin-bottom: 4px; border-bottom: 1px solid var(--border); }
.srow { display: flex; align-items: baseline; gap: 12px; padding: 7px 0; border-bottom: 1px solid var(--border); }
.srow:last-child { border-bottom: none; }
.srow:hover { background: var(--bg3); margin: 0 -24px; padding-left: 24px; padding-right: 24px; }
.scode { font-family: var(--mono); font-size: 13.5px; font-weight: 600; min-width: 38px; }
.s2 { color: var(--green); } .s3 { color: var(--blue); } .s4 { color: var(--amber); } .s5 { color: #f87171; }
.sdesc { font-size: 13.5px; color: var(--text); flex: 1; }
.strig { font-family: var(--mono); font-size: 11px; color: var(--text3); }

/* ─ FOOTER ───────────────────────────────── */
.footer {
  border-top: 1px solid var(--border);
  background: var(--bg2);
  padding: 24px 48px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
}
.footer-brand { font-family: var(--serif); font-size: 1.1rem; font-style: italic; color: var(--text); }
.footer-links { display: flex; gap: 24px; font-family: var(--mono); font-size: 11px; color: var(--text3); }
.footer-links a { color: var(--text3); text-decoration: none; border-bottom: 1px solid var(--border); padding-bottom: 1px; transition: color .12s, border-color .12s; }
.footer-links a:hover { color: var(--text); border-color: var(--text3); }

@media (max-width: 800px) {
  .hero { grid-template-columns: 1fr; gap: 36px; padding: 48px 24px; }
  .body-grid { grid-template-columns: 1fr; }
  .sidenav { display: none; }
  .content { padding: 32px 24px 48px; }
  .stat-wrap { grid-template-columns: 1fr; }
  .stat-col + .stat-col { border-left: none; border-top: 1px solid var(--border); }
  .topbar, .footer { padding-left: 24px; padding-right: 24px; }
}
</style>
</head>
<body>

<!-- TOP BAR -->
<div class="topbar">
  <div class="topbar-live"><span class="live-dot"></span>API Online — gorest.in</div>
  <div class="topbar-links">
    <a href="/privacy">Privacy Policy</a>
    <a href="https://www.youtube.com/@naveenAutomationLabs" target="_blank">YouTube ↗</a>
  </div>
</div>

<div class="wrap">

  <!-- HERO -->
  <section class="hero">
    <div>
      <h1 class="hero-title">Free<br><span class="italic">Mock</span><br>API.</h1>
      <p class="hero-desc">A drop-in replacement for gorest.co.in — built for QA &amp; SDET students who need a reliable endpoint to test against. Full CRUD. Real HTTP responses. No account required.</p>
      <div class="url-box">
        <span class="url-label">Base URL</span>
        https://gorest.in/public/v2/users
      </div>
      <div class="chips">
        <span class="chip">REST</span>
        <span class="chip">CRUD</span>
        <span class="chip">JSON &amp; XML</span>
        <span class="chip">Pagination</span>
        <span class="chip">Bearer Auth</span>
        <span class="chip">13 Status Codes</span>
        <span class="chip">Rate Limiting</span>
        <span class="chip">Free Forever</span>
      </div>
      <div class="postman-btns">
        <a class="btn-postman" href="/postman-collection" download="GoRest.in.postman_collection.json">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          Download Collection
        </a>
        <a class="btn-postman btn-open" href="https://app.getpostman.com/run-collection/gorest-in#?env%5BGoRest.in%5D=W3sia2V5IjoiYmFzZVVybCIsInZhbHVlIjoiaHR0cHM6Ly9nb3Jlc3QuaW4vcHVibGljL3YyIiwidHlwZSI6InN0cmluZyIsImVuYWJsZWQiOnRydWV9LHsia2V5IjoidG9rZW4iLCJ2YWx1ZSI6ImRlbW8tdG9rZW4iLCJ0eXBlIjoic3RyaW5nIiwiZW5hYmxlZCI6dHJ1ZX0seyJrZXkiOiJ1c2VySWQiLCJ2YWx1ZSI6IjEwMDEiLCJ0eXBlIjoic3RyaW5nIiwiZW5hYmxlZCI6dHJ1ZX1d" target="_blank" onclick="tryPostmanDeeplink(event, this)">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
          Run in Postman
        </a>
      </div>
    </div>
    <div class="hero-panel">
      <div class="panel-title">API Quick Info</div>
      <div class="panel-row"><span class="k">Status</span><span class="v green">● Operational</span></div>
      <div class="panel-row"><span class="k">Formats</span><span class="v">JSON &amp; XML</span></div>
      <div class="panel-row"><span class="k">Seed users</span><span class="v">20 (IDs 1001–1020)</span></div>
      <div class="panel-row"><span class="k">Rate limit</span><span class="v">60 req / min</span></div>
      <div class="panel-row"><span class="k">Auth required</span><span class="v">POST / PUT / PATCH / DELETE</span></div>
      <div class="panel-row"><span class="k">Replaces</span><span class="v">gorest.co.in</span></div>
      <div class="panel-row"><span class="k">Built by</span><span class="v">Naveen AutomationLabs</span></div>
    </div>
  </section>

  <!-- BODY -->
  <div class="body-grid">
    <nav class="sidenav">
      <div class="sidenav-title">Contents</div>
      <a href="#endpoints">Endpoints</a>
      <a href="#auth">Auth</a>
      <a href="#schema">Schema</a>
      <a href="#params">Query Params</a>
      <a href="#format">JSON &amp; XML</a>
      <a href="#examples">cURL Examples</a>
      <a href="#status">Status Codes</a>
      <a href="#rate">Rate Limiting</a>
      <a href="#notes">Notes</a>
    </nav>

    <main class="content">

      <!-- 01 ENDPOINTS -->
      <div class="sec" id="endpoints">
        <div class="sec-head"><span class="sec-num">01</span><span class="sec-title">Endpoints</span></div>
        <table class="ep">
          <tr>
            <td><span class="badge GET">GET</span></td>
            <td class="ep-path">/public/v2/users</td>
            <td><span class="badge open">public</span></td>
            <td>List all users — paginated &amp; filterable</td>
          </tr>
          <tr>
            <td><span class="badge POST">POST</span></td>
            <td class="ep-path">/public/v2/users</td>
            <td><span class="badge lock">token</span></td>
            <td>Create a new user</td>
          </tr>
          <tr>
            <td><span class="badge GET">GET</span></td>
            <td class="ep-path">/public/v2/users/:id</td>
            <td><span class="badge open">public</span></td>
            <td>Fetch single user by ID</td>
          </tr>
          <tr>
            <td><span class="badge PUT">PUT</span></td>
            <td class="ep-path">/public/v2/users/:id</td>
            <td><span class="badge lock">token</span></td>
            <td>Full replace — all fields required</td>
          </tr>
          <tr>
            <td><span class="badge PATCH">PATCH</span></td>
            <td class="ep-path">/public/v2/users/:id</td>
            <td><span class="badge lock">token</span></td>
            <td>Partial update — send only changed fields</td>
          </tr>
          <tr>
            <td><span class="badge DELETE">DELETE</span></td>
            <td class="ep-path">/public/v2/users/:id</td>
            <td><span class="badge lock">token</span></td>
            <td>Remove user permanently</td>
          </tr>
        </table>
      </div>

      <!-- 02 AUTH -->
      <div class="sec" id="auth">
        <div class="sec-head"><span class="sec-num">02</span><span class="sec-title">Authentication</span></div>
        <div class="callout">
          <p><strong>GET requests are open</strong> — no token needed. Hit them straight from browser, Postman, or any test tool.</p>
          <p><strong>POST, PUT, PATCH, DELETE</strong> require an <code>Authorization: Bearer &lt;token&gt;</code> header. Any non-empty string works — <code>demo-token</code>, <code>abc123</code>, your name, anything.</p>
          <p class="warn">⚠ Exception: <code>blocked-token</code> deliberately returns <strong>403 Forbidden</strong> — useful for testing error-handling flows.</p>
        </div>
      </div>

      <!-- 03 SCHEMA -->
      <div class="sec" id="schema">
        <div class="sec-head"><span class="sec-num">03</span><span class="sec-title">User Schema</span></div>
        <div class="schema-box">
          <div class="schema-bar">application/json</div>
          <div class="schema-body">{<br>
&nbsp;&nbsp;<span class="tok-k">"id"</span>:&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span class="tok-n">1001</span>,<br>
&nbsp;&nbsp;<span class="tok-k">"name"</span>:&nbsp;&nbsp;&nbsp;<span class="tok-s">"Aarav Sharma"</span>,<br>
&nbsp;&nbsp;<span class="tok-k">"email"</span>:&nbsp;&nbsp;<span class="tok-s">"aarav.sharma@example.com"</span>,<br>
&nbsp;&nbsp;<span class="tok-k">"gender"</span>: <span class="tok-s">"male"</span>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span class="tok-c">// "male" | "female"</span><br>
&nbsp;&nbsp;<span class="tok-k">"status"</span>: <span class="tok-s">"active"</span>&nbsp;&nbsp;&nbsp;<span class="tok-c">// "active" | "inactive"</span><br>
}</div>
        </div>
      </div>

      <!-- 04 QUERY PARAMS -->
      <div class="sec" id="params">
        <div class="sec-head"><span class="sec-num">04</span><span class="sec-title">Query Parameters</span></div>
        <table class="ptable">
          <tr><td>?name=</td><td>Filter by name (partial match) — e.g. <code>?name=aarav</code></td></tr>
          <tr><td>?email=</td><td>Filter by email — e.g. <code>?email=example.com</code></td></tr>
          <tr><td>?gender=</td><td>Filter by gender — <code>male</code> or <code>female</code></td></tr>
          <tr><td>?status=</td><td>Filter by status — <code>active</code> or <code>inactive</code></td></tr>
          <tr><td>?page=</td><td>Page number. Default: <code>1</code></td></tr>
          <tr><td>?per_page=</td><td>Results per page. Default: <code>10</code> &nbsp; Max: <code>100</code></td></tr>
        </table>
      </div>

      <!-- 05 JSON & XML -->
      <div class="sec" id="format">
        <div class="sec-head"><span class="sec-num">05</span><span class="sec-title">Response Format — JSON &amp; XML</span></div>
        <div class="callout blue" style="margin-bottom:16px">
          <p>All endpoints return <strong>JSON by default</strong>. Request XML using either method:</p>
          <p><strong>Option 1 — URL suffix:</strong> append <code>.xml</code> to any endpoint URL.</p>
          <p><strong>Option 2 — Accept header:</strong> send <code>Accept: application/xml</code> in your request.</p>
        </div>
        <div class="codeblock">
          <div class="codeblock-bar">URL suffix — collection</div>
          <pre><span class="tok-cmd">curl</span> <span class="tok-u">https://gorest.in/public/v2/users.xml</span></pre>
        </div>
        <div class="codeblock">
          <div class="codeblock-bar">URL suffix — single user</div>
          <pre><span class="tok-cmd">curl</span> <span class="tok-u">https://gorest.in/public/v2/users/1001.xml</span></pre>
        </div>
        <div class="codeblock">
          <div class="codeblock-bar">Accept header</div>
          <pre><span class="tok-cmd">curl</span> https://gorest.in/public/v2/users <span class="tok-f">-H</span> <span class="tok-q">"Accept: application/xml"</span></pre>
        </div>
        <div class="codeblock">
          <div class="codeblock-bar">XML response — collection</div>
          <pre><span class="tok-c">&lt;?xml version="1.0" encoding="UTF-8"?&gt;</span>
<span class="tok-k">&lt;users&gt;</span>
  <span class="tok-k">&lt;user&gt;</span>
    <span class="tok-k">&lt;id&gt;</span><span class="tok-n">1001</span><span class="tok-k">&lt;/id&gt;</span>
    <span class="tok-k">&lt;name&gt;</span><span class="tok-s">Aarav Sharma</span><span class="tok-k">&lt;/name&gt;</span>
    <span class="tok-k">&lt;email&gt;</span><span class="tok-s">aarav.sharma@example.com</span><span class="tok-k">&lt;/email&gt;</span>
    <span class="tok-k">&lt;gender&gt;</span><span class="tok-s">male</span><span class="tok-k">&lt;/gender&gt;</span>
    <span class="tok-k">&lt;status&gt;</span><span class="tok-s">active</span><span class="tok-k">&lt;/status&gt;</span>
  <span class="tok-k">&lt;/user&gt;</span>
<span class="tok-k">&lt;/users&gt;</span></pre>
        </div>
      </div>

      <!-- 06 CURL EXAMPLES -->
      <div class="sec" id="examples">
        <div class="sec-head"><span class="sec-num">06</span><span class="sec-title">cURL Examples</span></div>

        <div class="codeblock">
          <div class="codeblock-bar"><span class="badge GET" style="font-size:9.5px;padding:1px 7px">GET</span>&nbsp; List users — no token needed</div>
          <pre><span class="tok-cmd">curl</span> <span class="tok-u">https://gorest.in/public/v2/users</span></pre>
        </div>
        <div class="codeblock">
          <div class="codeblock-bar"><span class="badge GET" style="font-size:9.5px;padding:1px 7px">GET</span>&nbsp; Paginate &amp; filter</div>
          <pre><span class="tok-cmd">curl</span> <span class="tok-q">"https://gorest.in/public/v2/users?page=1&amp;per_page=10&amp;status=active"</span></pre>
        </div>
        <div class="codeblock">
          <div class="codeblock-bar"><span class="badge GET" style="font-size:9.5px;padding:1px 7px">GET</span>&nbsp; Single user by ID</div>
          <pre><span class="tok-cmd">curl</span> <span class="tok-u">https://gorest.in/public/v2/users/1001</span></pre>
        </div>
        <div class="codeblock">
          <div class="codeblock-bar"><span class="badge POST" style="font-size:9.5px;padding:1px 7px">POST</span>&nbsp; Create user — token required</div>
          <pre><span class="tok-cmd">curl</span> <span class="tok-f">-X POST</span> https://gorest.in/public/v2/users \
  <span class="tok-f">-H</span> <span class="tok-q">"Content-Type: application/json"</span> \
  <span class="tok-f">-H</span> <span class="tok-q">"Authorization: Bearer demo-token"</span> \
  <span class="tok-f">-d</span> <span class="tok-q">'{"name":"Naveen Kumar","email":"nk@test.com","gender":"male","status":"active"}'</span></pre>
        </div>
        <div class="codeblock">
          <div class="codeblock-bar"><span class="badge PATCH" style="font-size:9.5px;padding:1px 7px">PATCH</span>&nbsp; Partial update — token required</div>
          <pre><span class="tok-cmd">curl</span> <span class="tok-f">-X PATCH</span> https://gorest.in/public/v2/users/1001 \
  <span class="tok-f">-H</span> <span class="tok-q">"Content-Type: application/json"</span> \
  <span class="tok-f">-H</span> <span class="tok-q">"Authorization: Bearer demo-token"</span> \
  <span class="tok-f">-d</span> <span class="tok-q">'{"status":"inactive"}'</span></pre>
        </div>
        <div class="codeblock">
          <div class="codeblock-bar"><span class="badge DELETE" style="font-size:9.5px;padding:1px 7px">DELETE</span>&nbsp; Delete user — token required</div>
          <pre><span class="tok-cmd">curl</span> <span class="tok-f">-X DELETE</span> https://gorest.in/public/v2/users/1001 \
  <span class="tok-f">-H</span> <span class="tok-q">"Authorization: Bearer demo-token"</span></pre>
        </div>
      </div>

      <!-- 07 STATUS CODES -->
      <div class="sec" id="status">
        <div class="sec-head"><span class="sec-num">07</span><span class="sec-title">HTTP Status Codes</span></div>
        <div class="stat-wrap">
          <div class="stat-col">
            <div class="stat-col-title">2xx — 3xx &nbsp; Success</div>
            <div class="srow"><span class="scode s2">200</span><span class="sdesc">OK</span><span class="strig">GET / PUT / PATCH</span></div>
            <div class="srow"><span class="scode s2">201</span><span class="sdesc">Created</span><span class="strig">POST</span></div>
            <div class="srow"><span class="scode s2">204</span><span class="sdesc">No Content</span><span class="strig">DELETE</span></div>
            <div class="srow"><span class="scode s3">304</span><span class="sdesc">Not Modified</span><span class="strig">ETag cache hit</span></div>
          </div>
          <div class="stat-col">
            <div class="stat-col-title">4xx — 5xx &nbsp; Errors</div>
            <div class="srow"><span class="scode s4">400</span><span class="sdesc">Bad Request</span><span class="strig">invalid JSON</span></div>
            <div class="srow"><span class="scode s4">401</span><span class="sdesc">Unauthorized</span><span class="strig">missing token</span></div>
            <div class="srow"><span class="scode s4">403</span><span class="sdesc">Forbidden</span><span class="strig">blocked-token</span></div>
            <div class="srow"><span class="scode s4">404</span><span class="sdesc">Not Found</span><span class="strig">unknown ID</span></div>
            <div class="srow"><span class="scode s4">405</span><span class="sdesc">Method Not Allowed</span><span class="strig">wrong verb</span></div>
            <div class="srow"><span class="scode s4">415</span><span class="sdesc">Unsupported Media Type</span><span class="strig">no Content-Type</span></div>
            <div class="srow"><span class="scode s4">422</span><span class="sdesc">Validation Failed</span><span class="strig">bad field values</span></div>
            <div class="srow"><span class="scode s4">429</span><span class="sdesc">Too Many Requests</span><span class="strig">&gt;60 / min</span></div>
            <div class="srow"><span class="scode s5">500</span><span class="sdesc">Internal Server Error</span><span class="strig">unexpected crash</span></div>
          </div>
        </div>
      </div>

      <!-- 08 RATE LIMITING -->
      <div class="sec" id="rate">
        <div class="sec-head"><span class="sec-num">08</span><span class="sec-title">Rate Limiting</span></div>
        <table class="ptable">
          <tr><td>X-RateLimit-Limit</td><td>Max requests allowed per minute — <strong>60</strong></td></tr>
          <tr><td>X-RateLimit-Remaining</td><td>Requests remaining in the current window</td></tr>
          <tr><td>X-RateLimit-Reset</td><td>Seconds until the window resets</td></tr>
        </table>
      </div>

      <!-- 09 NOTES -->
      <div class="sec" id="notes">
        <div class="sec-head"><span class="sec-num">09</span><span class="sec-title">Notes</span></div>
        <table class="ptable">
          <tr><td>Seed data</td><td>20 pre-loaded users, IDs 1001–1020. New users auto-increment from 1021.</td></tr>
          <tr><td>Persistence</td><td>In-memory only — resets on server restart. Clean slate every session.</td></tr>
          <tr><td>Duplicate email</td><td>Returns 422 with a field-level validation error message.</td></tr>
          <tr><td>Pagination headers</td><td><code>X-Pagination-Total</code> &nbsp;<code>X-Pagination-Pages</code> &nbsp;<code>X-Pagination-Page</code> &nbsp;<code>X-Pagination-Limit</code></td></tr>
          <tr><td>XML support</td><td>Append <code>.xml</code> to any URL or send <code>Accept: application/xml</code> header.</td></tr>
          <tr><td>Replaces</td><td>gorest.co.in — same URL structure, existing Postman collections work as-is.</td></tr>
        </table>
      </div>

    </main>
  </div>

  <!-- FOOTER -->
  <footer class="footer">
    <div class="footer-brand">Built for the QA community.</div>
    <div class="footer-links">
      <a href="https://www.youtube.com/@naveenAutomationLabs" target="_blank">Naveen AutomationLabs ↗</a>
      <a href="/privacy">Privacy Policy</a>
      <a href="https://gorest.in/public/v2/users" target="_blank">Try the API ↗</a>
      <span>Free forever</span>
    </div>
  </footer>

</div>
<script>
function tryPostmanDeeplink(e, el) {
  e.preventDefault();
  // Try Postman desktop deep link first
  const deeplink = 'postman://app/collections/import?url=' + encodeURIComponent(window.location.origin + '/postman-collection');
  window.location.href = deeplink;
  // Fall back to download after 2.5s if Postman isn't installed
  setTimeout(() => {
    window.open('/postman-collection', '_blank');
  }, 2500);
}
</script>
</body>
</html>`);


});


// ─── POSTMAN COLLECTION ───────────────────────────────────────────────────────
const postmanCollection = {
  info: {
    _postman_id: "gorest-in-collection-v1",
    name: "GoRest.in — Mock REST API",
    description: "Free mock REST API for QA & SDET students. Drop-in replacement for gorest.co.in.\n\nBase URL: https://gorest.in/public/v2/users\n\nBuilt by Naveen AutomationLabs — https://www.youtube.com/@naveenAutomationLabs\n\nHow to use:\n- GET requests: no token needed\n- POST/PUT/PATCH/DELETE: any Bearer token works (e.g. demo-token)\n- Use 'blocked-token' to trigger 403 intentionally\n- Append .xml to any URL for XML responses",
    schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  variable: [
    { key: "baseUrl", value: "https://gorest.in/public/v2", type: "string" },
    { key: "token",   value: "demo-token",                  type: "string" },
    { key: "userId",  value: "1001",                        type: "string" }
  ],
  item: [
    {
      name: "Users",
      item: [
        {
          name: "GET All Users",
          request: {
            method: "GET",
            header: [],
            url: {
              raw: "{{baseUrl}}/users",
              host: ["{{baseUrl}}"],
              path: ["users"]
            },
            description: "Returns a paginated list of all users. No token required.\n\nSupports query params: ?name= ?email= ?gender= ?status= ?page= ?per_page="
          },
          response: []
        },
        {
          name: "GET All Users — Paginated",
          request: {
            method: "GET",
            header: [],
            url: {
              raw: "{{baseUrl}}/users?page=1&per_page=10",
              host: ["{{baseUrl}}"],
              path: ["users"],
              query: [
                { key: "page",     value: "1" },
                { key: "per_page", value: "10" }
              ]
            },
            description: "Paginated request. Default per_page is 10, max is 100."
          },
          response: []
        },
        {
          name: "GET All Users — Filter by Status",
          request: {
            method: "GET",
            header: [],
            url: {
              raw: "{{baseUrl}}/users?status=active",
              host: ["{{baseUrl}}"],
              path: ["users"],
              query: [
                { key: "status", value: "active" }
              ]
            },
            description: "Filter users by status. Values: active | inactive"
          },
          response: []
        },
        {
          name: "GET All Users — Filter by Gender",
          request: {
            method: "GET",
            header: [],
            url: {
              raw: "{{baseUrl}}/users?gender=male",
              host: ["{{baseUrl}}"],
              path: ["users"],
              query: [
                { key: "gender", value: "male" }
              ]
            },
            description: "Filter users by gender. Values: male | female"
          },
          response: []
        },
        {
          name: "GET All Users — XML Response",
          request: {
            method: "GET",
            header: [
              { key: "Accept", value: "application/xml", type: "text" }
            ],
            url: {
              raw: "{{baseUrl}}/users",
              host: ["{{baseUrl}}"],
              path: ["users"]
            },
            description: "Returns users in XML format using Accept header.\n\nAlternatively, use URL suffix: GET {{baseUrl}}/users.xml"
          },
          response: []
        },
        {
          name: "GET All Users — XML via URL Suffix",
          request: {
            method: "GET",
            header: [],
            url: {
              raw: "{{baseUrl}}/users.xml",
              host: ["{{baseUrl}}"],
              path: ["users.xml"]
            },
            description: "Returns all users in XML by appending .xml to the URL."
          },
          response: []
        },
        {
          name: "GET Single User by ID",
          request: {
            method: "GET",
            header: [],
            url: {
              raw: "{{baseUrl}}/users/{{userId}}",
              host: ["{{baseUrl}}"],
              path: ["users", "{{userId}}"]
            },
            description: "Fetch a single user by ID. No token required.\n\nReturns 404 if ID does not exist."
          },
          response: []
        },
        {
          name: "GET Single User — XML",
          request: {
            method: "GET",
            header: [],
            url: {
              raw: "{{baseUrl}}/users/{{userId}}.xml",
              host: ["{{baseUrl}}"],
              path: ["users", "{{userId}}.xml"]
            },
            description: "Returns a single user in XML format via URL suffix."
          },
          response: []
        },
        {
          name: "POST Create User",
          request: {
            method: "POST",
            header: [
              { key: "Content-Type",  value: "application/json",      type: "text" },
              { key: "Authorization", value: "Bearer {{token}}",       type: "text" }
            ],
            body: {
              mode: "raw",
              raw: JSON.stringify({
                name:   "Naveen Kumar",
                email:  "naveen.kumar@example.com",
                gender: "male",
                status: "active"
              }, null, 2),
              options: { raw: { language: "json" } }
            },
            url: {
              raw: "{{baseUrl}}/users",
              host: ["{{baseUrl}}"],
              path: ["users"]
            },
            description: "Creates a new user. Token required.\n\nRequired fields:\n- name (string)\n- email (string, unique)\n- gender (male | female)\n- status (active | inactive)\n\nReturns 201 on success, 422 on validation failure."
          },
          response: []
        },
        {
          name: "PUT Full Update User",
          request: {
            method: "PUT",
            header: [
              { key: "Content-Type",  value: "application/json", type: "text" },
              { key: "Authorization", value: "Bearer {{token}}",  type: "text" }
            ],
            body: {
              mode: "raw",
              raw: JSON.stringify({
                name:   "Naveen Kumar Updated",
                email:  "naveen.updated@example.com",
                gender: "male",
                status: "inactive"
              }, null, 2),
              options: { raw: { language: "json" } }
            },
            url: {
              raw: "{{baseUrl}}/users/{{userId}}",
              host: ["{{baseUrl}}"],
              path: ["users", "{{userId}}"]
            },
            description: "Full replace of a user record. All fields required. Token required.\n\nReturns 200 on success, 404 if user not found, 422 on validation failure."
          },
          response: []
        },
        {
          name: "PATCH Partial Update User",
          request: {
            method: "PATCH",
            header: [
              { key: "Content-Type",  value: "application/json", type: "text" },
              { key: "Authorization", value: "Bearer {{token}}",  type: "text" }
            ],
            body: {
              mode: "raw",
              raw: JSON.stringify({ status: "inactive" }, null, 2),
              options: { raw: { language: "json" } }
            },
            url: {
              raw: "{{baseUrl}}/users/{{userId}}",
              host: ["{{baseUrl}}"],
              path: ["users", "{{userId}}"]
            },
            description: "Partial update — only send the fields you want to change. Token required.\n\nReturns 200 on success, 404 if user not found."
          },
          response: []
        },
        {
          name: "DELETE User",
          request: {
            method: "DELETE",
            header: [
              { key: "Authorization", value: "Bearer {{token}}", type: "text" }
            ],
            url: {
              raw: "{{baseUrl}}/users/{{userId}}",
              host: ["{{baseUrl}}"],
              path: ["users", "{{userId}}"]
            },
            description: "Permanently deletes a user. Token required.\n\nReturns 204 No Content on success, 404 if user not found."
          },
          response: []
        }
      ]
    },
    {
      name: "Status Code Scenarios",
      item: [
        {
          name: "401 — Missing Token",
          request: {
            method: "POST",
            header: [
              { key: "Content-Type", value: "application/json", type: "text" }
            ],
            body: {
              mode: "raw",
              raw: JSON.stringify({ name: "Test", email: "t@test.com", gender: "male", status: "active" }, null, 2),
              options: { raw: { language: "json" } }
            },
            url: {
              raw: "{{baseUrl}}/users",
              host: ["{{baseUrl}}"],
              path: ["users"]
            },
            description: "No Authorization header → 401 Unauthorized"
          },
          response: []
        },
        {
          name: "403 — Blocked Token",
          request: {
            method: "POST",
            header: [
              { key: "Content-Type",  value: "application/json",  type: "text" },
              { key: "Authorization", value: "Bearer blocked-token", type: "text" }
            ],
            body: {
              mode: "raw",
              raw: JSON.stringify({ name: "Test", email: "t@test.com", gender: "male", status: "active" }, null, 2),
              options: { raw: { language: "json" } }
            },
            url: {
              raw: "{{baseUrl}}/users",
              host: ["{{baseUrl}}"],
              path: ["users"]
            },
            description: "Using 'blocked-token' deliberately returns 403 Forbidden — useful for testing forbidden error handling."
          },
          response: []
        },
        {
          name: "404 — User Not Found",
          request: {
            method: "GET",
            header: [],
            url: {
              raw: "{{baseUrl}}/users/99999",
              host: ["{{baseUrl}}"],
              path: ["users", "99999"]
            },
            description: "Non-existent user ID → 404 Not Found"
          },
          response: []
        },
        {
          name: "405 — Method Not Allowed",
          request: {
            method: "DELETE",
            header: [
              { key: "Authorization", value: "Bearer {{token}}", type: "text" }
            ],
            url: {
              raw: "{{baseUrl}}/users",
              host: ["{{baseUrl}}"],
              path: ["users"]
            },
            description: "DELETE on collection endpoint (no ID) → 405 Method Not Allowed"
          },
          response: []
        },
        {
          name: "415 — Missing Content-Type",
          request: {
            method: "POST",
            header: [
              { key: "Authorization", value: "Bearer {{token}}", type: "text" }
            ],
            body: {
              mode: "raw",
              raw: JSON.stringify({ name: "Test", email: "t@test.com", gender: "male", status: "active" }, null, 2)
            },
            url: {
              raw: "{{baseUrl}}/users",
              host: ["{{baseUrl}}"],
              path: ["users"]
            },
            description: "POST without Content-Type: application/json → 415 Unsupported Media Type"
          },
          response: []
        },
        {
          name: "422 — Validation Failed",
          request: {
            method: "POST",
            header: [
              { key: "Content-Type",  value: "application/json", type: "text" },
              { key: "Authorization", value: "Bearer {{token}}",  type: "text" }
            ],
            body: {
              mode: "raw",
              raw: JSON.stringify({ name: "", email: "not-an-email", gender: "unknown", status: "active" }, null, 2),
              options: { raw: { language: "json" } }
            },
            url: {
              raw: "{{baseUrl}}/users",
              host: ["{{baseUrl}}"],
              path: ["users"]
            },
            description: "Invalid field values → 422 Validation Failed with field-level errors"
          },
          response: []
        },
        {
          name: "304 — Not Modified (ETag)",
          request: {
            method: "GET",
            header: [
              { key: "If-None-Match", value: "fetch-first-then-paste-etag-here", type: "text" }
            ],
            url: {
              raw: "{{baseUrl}}/users",
              host: ["{{baseUrl}}"],
              path: ["users"]
            },
            description: "Step 1: Make a normal GET /users and copy the ETag response header value.\nStep 2: Paste it as the If-None-Match header value here.\nStep 3: Run — returns 304 Not Modified (empty body)."
          },
          response: []
        }
      ]
    }
  ]
};

app.get("/postman-collection", (req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Content-Disposition", 'attachment; filename="GoRest.in.postman_collection.json"');
  res.status(200).json(postmanCollection);
});


// ─── PRIVACY POLICY PAGE ─────────────────────────────────────────────────────
app.get("/privacy", (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Privacy Policy — GoRest.in</title>
<link rel="icon" type="image/svg+xml" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' rx='18' fill='%2311141c'/><text y='72' x='50' text-anchor='middle' font-size='62' font-family='Georgia,serif' fill='%23e05c3a' font-style='italic'>G</text><text y='88' x='68' text-anchor='middle' font-size='22' font-family='monospace' fill='%2334d399'>.in</text></svg>">
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=Fraunces:ital,wght@0,800;1,700&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..500&display=swap" rel="stylesheet">
<style>
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
:root {
  --bg: #0d1117; --bg2: #161b22; --bg3: #1c2230;
  --border: #2a3344; --text: #e6edf3; --text2: #b0bec8; --text3: #6e7f8d;
  --red: #e05c3a; --green: #34d399;
  --mono: 'IBM Plex Mono', monospace;
  --serif: 'Fraunces', Georgia, serif;
  --sans: 'DM Sans', system-ui, sans-serif;
}
body { font-family: var(--sans); background: var(--bg); color: var(--text); line-height: 1.7; -webkit-font-smoothing: antialiased; }
.topbar { background: var(--bg2); border-bottom: 1px solid var(--border); padding: 9px 40px; display: flex; justify-content: space-between; align-items: center; font-family: var(--mono); font-size: 11.5px; color: var(--text3); }
.topbar a { color: var(--text3); text-decoration: none; } .topbar a:hover { color: var(--text); }
.topbar-brand { display: flex; align-items: center; gap: 16px; }
.page { max-width: 720px; margin: 0 auto; padding: 64px 40px 96px; }
.page-eyebrow { font-family: var(--mono); font-size: 10.5px; letter-spacing: 3px; text-transform: uppercase; color: var(--red); margin-bottom: 16px; }
.page-title { font-family: var(--serif); font-size: clamp(2rem, 4vw, 3rem); font-weight: 900; line-height: 1; letter-spacing: -1px; color: var(--text); margin-bottom: 12px; }
.page-meta { font-family: var(--mono); font-size: 12px; color: var(--text3); margin-bottom: 48px; padding-bottom: 32px; border-bottom: 1px solid var(--border); }
.section { margin-bottom: 40px; }
.section h2 { font-family: var(--mono); font-size: 11px; letter-spacing: 2.5px; text-transform: uppercase; color: var(--green); margin-bottom: 14px; }
.section p { font-size: 14.5px; color: var(--text2); font-weight: 300; line-height: 1.8; margin-bottom: 12px; }
.section p:last-child { margin-bottom: 0; }
.section ul { list-style: none; padding: 0; }
.section ul li { font-size: 14.5px; color: var(--text2); font-weight: 300; line-height: 1.8; padding: 4px 0 4px 16px; position: relative; }
.section ul li::before { content: '→'; position: absolute; left: 0; color: var(--text3); font-family: var(--mono); }
.section a { color: var(--green); text-decoration: none; border-bottom: 1px solid #1a5c42; }
.section a:hover { border-color: var(--green); }
.notice { background: var(--bg2); border: 1px solid var(--border); border-left: 3px solid var(--green); border-radius: 0 6px 6px 0; padding: 16px 20px; margin-bottom: 40px; }
.notice p { font-size: 13.5px; color: var(--text2); font-weight: 300; }
.footer { border-top: 1px solid var(--border); background: var(--bg2); padding: 20px 40px; text-align: center; font-family: var(--mono); font-size: 11px; color: var(--text3); }
.footer a { color: var(--text3); text-decoration: none; } .footer a:hover { color: var(--text); }
</style>
</head>
<body>

<div class="topbar">
  <div class="topbar-brand">
    <a href="/" style="font-family:'Fraunces',serif;font-size:1.1rem;font-style:italic;color:var(--text)">GoRest.in</a>
    <span style="color:var(--border)">|</span>
    <span>Privacy Policy</span>
  </div>
  <a href="/">← Back to API Docs</a>
</div>

<div class="page">
  <div class="page-eyebrow">Legal</div>
  <h1 class="page-title">Privacy Policy</h1>
  <div class="page-meta">Last updated: March 2026 &nbsp;·&nbsp; GoRest.in &nbsp;·&nbsp; Naveen AutomationLabs FZCO</div>

  <div class="notice">
    <p><strong style="color:var(--text)">Short version:</strong> GoRest.in is a free developer tool. We do not collect, store, or sell your personal data. The API stores data only in memory and resets on each server restart.</p>
  </div>

  <div class="section">
    <h2>1. Who We Are</h2>
    <p>GoRest.in is a free mock REST API service built and maintained by <strong style="color:var(--text)">Naveen AutomationLabs FZCO</strong>, a company registered in Dubai, UAE (DAFZA Free Zone, License #4949). The service is provided at <a href="https://gorest.in">https://gorest.in</a> for educational and testing purposes.</p>
  </div>

  <div class="section">
    <h2>2. What Data We Collect</h2>
    <p>We collect minimal data to operate the service:</p>
    <ul>
      <li><strong style="color:var(--text)">Request logs:</strong> Standard web server logs (IP address, request path, HTTP method, timestamp, response code). These are used for debugging and rate limiting only.</li>
      <li><strong style="color:var(--text)">API data you submit:</strong> User records (name, email, gender, status) sent via POST/PUT/PATCH are stored in-memory only and are permanently deleted on every server restart. We do not persist this data to any database.</li>
      <li><strong style="color:var(--text)">No cookies:</strong> GoRest.in does not set any cookies or use browser storage.</li>
      <li><strong style="color:var(--text)">No tracking:</strong> We do not use Google Analytics, Facebook Pixel, or any third-party tracking scripts.</li>
    </ul>
  </div>

  <div class="section">
    <h2>3. How We Use Data</h2>
    <ul>
      <li>To serve API responses to your requests</li>
      <li>To enforce the rate limit (60 requests per minute per IP)</li>
      <li>To debug issues and monitor service uptime</li>
    </ul>
    <p>We do not use your data for marketing, profiling, advertising, or any commercial purpose.</p>
  </div>

  <div class="section">
    <h2>4. Data You Submit to the API</h2>
    <p>Any data you POST to the API (names, emails, etc.) is stored in server memory only. It is not written to a database, not backed up, and is permanently erased when the server restarts. <strong style="color:var(--text)">Do not submit real personal data</strong> — this is a test API. Use fictional or dummy data only.</p>
  </div>

  <div class="section">
    <h2>5. Third-Party Services</h2>
    <ul>
      <li><strong style="color:var(--text)">Vercel:</strong> GoRest.in is hosted on Vercel's infrastructure. Vercel may collect standard server logs. See <a href="https://vercel.com/legal/privacy-policy" target="_blank">Vercel's Privacy Policy ↗</a></li>
      <li><strong style="color:var(--text)">Google Fonts:</strong> The documentation page loads fonts from Google Fonts CDN. See <a href="https://policies.google.com/privacy" target="_blank">Google's Privacy Policy ↗</a></li>
    </ul>
  </div>

  <div class="section">
    <h2>6. Your Rights</h2>
    <p>Since we do not store personal data persistently, there is no data to access, correct, or delete. If you have concerns about server-side request logs, you may contact us and we will address them within 30 days.</p>
  </div>

  <div class="section">
    <h2>7. Children's Privacy</h2>
    <p>GoRest.in is a developer tool intended for use by adults and students learning software testing. We do not knowingly collect data from children under 13.</p>
  </div>

  <div class="section">
    <h2>8. Changes to This Policy</h2>
    <p>We may update this policy from time to time. The "last updated" date at the top of this page reflects the most recent revision. Continued use of the service after changes constitutes acceptance of the updated policy.</p>
  </div>

  <div class="section">
    <h2>9. Contact</h2>
    <p>For privacy-related questions, reach out via the <a href="https://www.youtube.com/@naveenAutomationLabs" target="_blank">Naveen AutomationLabs YouTube channel ↗</a> or through LinkedIn.</p>
    <p style="margin-top:12px;font-family:var(--mono);font-size:12px;color:var(--text3)">Naveen AutomationLabs FZCO &nbsp;·&nbsp; DAFZA Free Zone, Dubai, UAE</p>
  </div>
</div>

<footer class="footer">
  <a href="/">← GoRest.in API Docs</a> &nbsp;·&nbsp;
  <a href="https://www.youtube.com/@naveenAutomationLabs" target="_blank">Naveen AutomationLabs</a> &nbsp;·&nbsp;
  Free forever
</footer>

<script>
function tryPostmanDeeplink(e, el) {
  e.preventDefault();
  // Try Postman desktop deep link first
  const deeplink = 'postman://app/collections/import?url=' + encodeURIComponent(window.location.origin + '/postman-collection');
  window.location.href = deeplink;
  // Fall back to download after 2.5s if Postman isn't installed
  setTimeout(() => {
    window.open('/postman-collection', '_blank');
  }, 2500);
}
</script>
</body>
</html>`);
});

// ─── XML HELPERS ──────────────────────────────────────────────────────────────
function escapeXml(val) {
  return String(val)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function userToXml(u) {
  const t = (tag, val) => '    <' + tag + '>' + val + '</' + tag + '>';
  return [
    '  <user>',
    t('id', u.id),
    t('name', escapeXml(u.name)),
    t('email', escapeXml(u.email)),
    t('gender', escapeXml(u.gender)),
    t('status', escapeXml(u.status)),
    '  </user>'
  ].join('\n');
}

function usersToXml(arr) {
  return `<?xml version="1.0" encoding="UTF-8"?>\n<users>\n${arr.map(userToXml).join("\n")}\n</users>`;
}

function errorToXml(msg) {
  return `<?xml version="1.0" encoding="UTF-8"?>\n<error>\n  <message>${escapeXml(msg)}</message>\n</error>`;
}

function errorsToXml(errors) {
  const items = errors.map(e => `  <error>\n    <field>${escapeXml(e.field)}</field>\n    <message>${escapeXml(e.message)}</message>\n  </error>`).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<errors>\n${items}\n</errors>`;
}

// Detect if client wants XML — via .xml suffix or Accept header
function wantsXml(req, xmlSuffix) {
  return xmlSuffix || (req.headers["accept"] && req.headers["accept"].includes("application/xml"));
}

function sendData(res, status, data, xml, isXml) {
  if (isXml) {
    res.set("Content-Type", "application/xml; charset=utf-8");
    return res.status(status).send(xml);
  }
  res.status(status).json(data);
}

// ─── GET /public/v2/users(.xml)? ──────────────────────────────────────────────
app.get("/public/v2/users", (req, res) => {
  return handleGetUsers(req, res, false);
});
app.get("/public/v2/users.xml", (req, res) => {
  return handleGetUsers(req, res, true);
});

function handleGetUsers(req, res, xmlSuffix) {
  const isXml = wantsXml(req, xmlSuffix);
  let result = [...users];

  // 304 — ETag / If-None-Match caching support
  const etag = `"users-${users.length}-${nextId}"`;
  res.set("ETag", etag);
  if (req.headers["if-none-match"] === etag) {
    return res.status(304).end();
  }

  // Filtering
  if (req.query.name)   result = result.filter((u) => u.name.toLowerCase().includes(req.query.name.toLowerCase()));
  if (req.query.email)  result = result.filter((u) => u.email.toLowerCase().includes(req.query.email.toLowerCase()));
  if (req.query.gender) result = result.filter((u) => u.gender === req.query.gender);
  if (req.query.status) result = result.filter((u) => u.status === req.query.status);

  // Pagination
  const total = result.length;
  const perPage = Math.min(parseInt(req.query.per_page) || 10, 100);
  const page = parseInt(req.query.page) || 1;
  const totalPages = Math.ceil(total / perPage);
  const start = (page - 1) * perPage;
  const paginated = result.slice(start, start + perPage);

  res.set({
    "X-Pagination-Total": total,
    "X-Pagination-Pages": totalPages,
    "X-Pagination-Page": page,
    "X-Pagination-Limit": perPage,
  });

  sendData(res, 200, paginated, usersToXml(paginated), isXml);
}

// ─── POST /public/v2/users(.xml)? ─────────────────────────────────────────────
app.post("/public/v2/users", (req, res) => {
  return handlePostUser(req, res, false);
});
app.post("/public/v2/users.xml", (req, res) => {
  return handlePostUser(req, res, true);
});

function handlePostUser(req, res, xmlSuffix) {
  const isXml = wantsXml(req, xmlSuffix);
  const errors = validateUser(req.body, true);
  if (errors.length) {
    return sendData(res, 422, errors, errorsToXml(errors), isXml);
  }
  const user = {
    id: nextId++,
    name: req.body.name.trim(),
    email: req.body.email.trim().toLowerCase(),
    gender: req.body.gender,
    status: req.body.status,
  };
  users.push(user);
  sendData(res, 201, user, `<?xml version="1.0" encoding="UTF-8"?>\n${userToXml(user).trim()}`, isXml);
}

// ─── GET /public/v2/users/:id(.xml)? ──────────────────────────────────────────
app.get("/public/v2/users/:id.xml", (req, res) => {
  req.params.id = req.params.id.replace(/\.xml$/, "");
  return handleGetUser(req, res, true);
});
app.get("/public/v2/users/:id", (req, res) => {
  return handleGetUser(req, res, false);
});


function handleGetUser(req, res, xmlSuffix) {
  const isXml = wantsXml(req, xmlSuffix);
  const user = users.find((u) => u.id === parseInt(req.params.id));
  if (!user) return sendData(res, 404, { message: "Resource not found" }, errorToXml("Resource not found"), isXml);
  sendData(res, 200, user, `<?xml version="1.0" encoding="UTF-8"?>\n${userToXml(user).trim()}`, isXml);
}

// ─── PUT /public/v2/users/:id(.xml)? ──────────────────────────────────────────
app.put("/public/v2/users/:id.xml", (req, res) => {
  req.params.id = req.params.id.replace(/\.xml$/, "");
  return handlePutUser(req, res, true);
});
app.put("/public/v2/users/:id", (req, res) => {
  return handlePutUser(req, res, false);
});


function handlePutUser(req, res, xmlSuffix) {
  const isXml = wantsXml(req, xmlSuffix);
  const idx = users.findIndex((u) => u.id === parseInt(req.params.id));
  if (idx === -1) return sendData(res, 404, { message: "Resource not found" }, errorToXml("Resource not found"), isXml);

  const tempUsers = users.filter((_, i) => i !== idx);
  const savedUsers = users;
  users = tempUsers;
  const errors = validateUser(req.body, true);
  users = savedUsers;
  if (errors.length) return sendData(res, 422, errors, errorsToXml(errors), isXml);

  users[idx] = {
    id: users[idx].id,
    name: req.body.name.trim(),
    email: req.body.email.trim().toLowerCase(),
    gender: req.body.gender,
    status: req.body.status,
  };
  sendData(res, 200, users[idx], `<?xml version="1.0" encoding="UTF-8"?>\n${userToXml(users[idx]).trim()}`, isXml);
}

// ─── PATCH /public/v2/users/:id(.xml)? ──────────────────────────────────────────
app.patch("/public/v2/users/:id.xml", (req, res) => {
  req.params.id = req.params.id.replace(/\.xml$/, "");
  return handlePatchUser(req, res, true);
});
app.patch("/public/v2/users/:id", (req, res) => {
  return handlePatchUser(req, res, false);
});


function handlePatchUser(req, res, xmlSuffix) {
  const isXml = wantsXml(req, xmlSuffix);
  const idx = users.findIndex((u) => u.id === parseInt(req.params.id));
  if (idx === -1) return sendData(res, 404, { message: "Resource not found" }, errorToXml("Resource not found"), isXml);

  const savedUsers = users;
  const tempUsers = users.filter((_, i) => i !== idx);
  users = tempUsers;
  const errors = validateUser(req.body, false);
  users = savedUsers;
  if (errors.length) return sendData(res, 422, errors, errorsToXml(errors), isXml);

  if (req.body.name   !== undefined) users[idx].name   = req.body.name.trim();
  if (req.body.email  !== undefined) users[idx].email  = req.body.email.trim().toLowerCase();
  if (req.body.gender !== undefined) users[idx].gender = req.body.gender;
  if (req.body.status !== undefined) users[idx].status = req.body.status;

  sendData(res, 200, users[idx], `<?xml version="1.0" encoding="UTF-8"?>\n${userToXml(users[idx]).trim()}`, isXml);
}

// ─── DELETE /public/v2/users/:id(.xml)? ──────────────────────────────────────────
app.delete("/public/v2/users/:id.xml", (req, res) => {
  req.params.id = req.params.id.replace(/\.xml$/, "");
  return handleDeleteUser(req, res, true);
});
app.delete("/public/v2/users/:id", (req, res) => {
  return handleDeleteUser(req, res, false);
});


function handleDeleteUser(req, res, xmlSuffix) {
  const idx = users.findIndex((u) => u.id === parseInt(req.params.id));
  if (idx === -1) {
    const isXml = wantsXml(req, xmlSuffix);
    return sendData(res, 404, { message: "Resource not found" }, errorToXml("Resource not found"), isXml);
  }
  users.splice(idx, 1);
  res.status(204).send();
}

// ─── 405 Method Not Allowed ───────────────────────────────────────────────────
app.all("/public/v2/users", (req, res) => {
  res.set("Allow", "GET, POST");
  res.status(405).json({ message: `Method ${req.method} not allowed on this endpoint. Allowed: GET, POST` });
});

app.all(/^\/public\/v2\/users\/\d+(\.xml)?$/, (req, res) => {
  res.set("Allow", "GET, PUT, PATCH, DELETE");
  res.status(405).json({ message: `Method ${req.method} not allowed on this endpoint. Allowed: GET, PUT, PATCH, DELETE` });
});

// ─── 500 Internal Server Error ────────────────────────────────────────────────
// Global error handler — catches any unhandled thrown errors
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ message: "Internal server error. Something went wrong on our end." });
});

module.exports = app;

