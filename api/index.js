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
<meta name="description" content="Free mock REST API for QA and SDET students. Drop-in replacement for GoRest. No signup. Built by Naveen AutomationLabs.">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Geist+Mono:wght@300;400;500&family=Geist:wght@300;400;500&display=swap" rel="stylesheet">
<style>
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

:root {
  --paper:   #f7f4ef;
  --paper2:  #efebe3;
  --ink:     #18140f;
  --ink2:    #52473a;
  --ink3:    #9c8f80;
  --line:    #ddd6cb;
  --red:     #c0392b;
  --blue:    #1a56db;
  --green:   #1a6b3a;
  --amber:   #92400e;
  --code-bg: #131009;
  --serif: 'Instrument Serif', Georgia, serif;
  --mono:  'Geist Mono', 'Menlo', monospace;
  --sans:  'Geist', system-ui, sans-serif;
}

html { font-size: 15px; }
body {
  font-family: var(--sans);
  background: var(--paper);
  color: var(--ink);
  line-height: 1.6;
  -webkit-font-smoothing: antialiased;
}

/* ─ TOP BAR ─────────────────── */
.topbar {
  background: var(--ink);
  color: #b5a898;
  font-family: var(--mono);
  font-size: 11px;
  letter-spacing: .6px;
  padding: 8px 40px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.topbar-live { display: flex; align-items: center; gap: 7px; color: #5fba7d; }
.live-dot { width: 6px; height: 6px; background: #5fba7d; border-radius: 50%; animation: blink 2s ease-in-out infinite; }
@keyframes blink { 0%,100%{opacity:1} 50%{opacity:.2} }

/* ─ HERO ─────────────────────── */
.hero {
  border-bottom: 1px solid var(--line);
  padding: 72px 40px 64px;
  max-width: 1080px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 5fr 4fr;
  gap: 60px;
  align-items: end;
}
.hero-title {
  font-family: var(--serif);
  font-size: clamp(52px, 7vw, 88px);
  line-height: .93;
  letter-spacing: -1.5px;
  color: var(--ink);
  margin-bottom: 28px;
}
.hero-title .italic { font-style: italic; color: var(--red); }
.hero-subtitle {
  font-size: 15px;
  color: var(--ink2);
  font-weight: 300;
  line-height: 1.8;
  max-width: 380px;
  margin-bottom: 32px;
}
.url-box {
  font-family: var(--mono);
  font-size: 12.5px;
  background: var(--ink);
  color: #c8bfb2;
  padding: 13px 18px;
  border-radius: 4px;
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
  font-weight: 500;
  padding: 2px 8px;
  border-radius: 2px;
  letter-spacing: 1px;
  text-transform: uppercase;
  flex-shrink: 0;
}
.chips { display: flex; flex-wrap: wrap; gap: 7px; }
.chip {
  font-family: var(--mono);
  font-size: 10px;
  letter-spacing: .4px;
  text-transform: uppercase;
  color: var(--ink3);
  border: 1px solid var(--line);
  border-radius: 2px;
  padding: 3px 9px;
}

/* hero right — live tester */
.hero-panel {
  border-left: 1px solid var(--line);
  padding-left: 48px;
  align-self: stretch;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 10px;
}
.panel-label {
  font-family: var(--mono);
  font-size: 10px;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: var(--ink3);
  margin-bottom: 4px;
}
.panel-stat {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  padding: 9px 0;
  border-bottom: 1px solid var(--line);
  font-size: 13px;
}
.panel-stat:last-child { border-bottom: none; }
.panel-stat .key { color: var(--ink3); font-weight: 300; }
.panel-stat .val { font-family: var(--mono); font-size: 12.5px; color: var(--ink); }
.panel-stat .val.green { color: var(--green); }

/* ─ BODY LAYOUT ─────────────── */
.wrap { max-width: 1080px; margin: 0 auto; }
.body-grid {
  display: grid;
  grid-template-columns: 172px 1fr;
  border-bottom: 1px solid var(--line);
}
.sidenav {
  border-right: 1px solid var(--line);
  padding: 36px 24px 36px 40px;
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
  color: var(--ink3);
  margin-bottom: 14px;
}
.sidenav a {
  display: block;
  font-family: var(--mono);
  font-size: 11.5px;
  color: var(--ink3);
  text-decoration: none;
  padding: 5px 0;
  border-bottom: 1px solid transparent;
  transition: color .12s;
}
.sidenav a:hover { color: var(--ink); }

/* ─ SECTIONS ────────────────── */
.content { padding: 40px 52px 60px; }
.sec { margin-bottom: 56px; }
.sec-head {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 22px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--line);
}
.sec-num {
  font-family: var(--mono);
  font-size: 10px;
  color: var(--line);
  letter-spacing: 1px;
  flex-shrink: 0;
}
.sec-title {
  font-family: var(--mono);
  font-size: 10.5px;
  letter-spacing: 2.5px;
  text-transform: uppercase;
  color: var(--red);
  font-weight: 400;
}

/* ─ ENDPOINTS TABLE ─────────── */
.ep { width: 100%; border-collapse: collapse; }
.ep tr { border-bottom: 1px solid var(--line); }
.ep tr:last-child { border-bottom: none; }
.ep td { padding: 11px 0; vertical-align: middle; }
.ep td:nth-child(1) { width: 66px; }
.ep td:nth-child(2) { padding: 0 20px; }
.ep td:nth-child(3) { width: 74px; }
.ep td:nth-child(4) { color: var(--ink3); font-size: 13.5px; font-weight: 300; }
.badge {
  font-family: var(--mono);
  font-size: 10px;
  font-weight: 500;
  padding: 3px 8px;
  border-radius: 2px;
  letter-spacing: .5px;
  display: inline-block;
  text-align: center;
  min-width: 54px;
}
.GET    { background:#ecfdf5; color:#065f46; border:1px solid #a7f3d0; }
.POST   { background:#eff6ff; color:#1e3a8a; border:1px solid #bfdbfe; }
.PUT    { background:#fefce8; color:#713f12; border:1px solid #fde68a; }
.PATCH  { background:#fff7ed; color:#9a3412; border:1px solid #fed7aa; }
.DELETE { background:#fef2f2; color:#7f1d1d; border:1px solid #fecaca; }
.open { background:#f0fdf4; color:#14532d; border:1px solid #bbf7d0; }
.lock { background:#fffbeb; color:#78350f; border:1px solid #fde68a; }
.ep-path { font-family: var(--mono); font-size: 12.5px; color: var(--ink); }

/* ─ CODE BLOCK ──────────────── */
.codeblock { background: var(--code-bg); border-radius: 5px; overflow: hidden; margin-bottom: 14px; }
.codeblock-bar {
  background: #1e1a14;
  padding: 7px 16px;
  font-family: var(--mono);
  font-size: 10px;
  color: #5c5248;
  letter-spacing: 1px;
  text-transform: uppercase;
  display: flex;
  align-items: center;
  gap: 10px;
  border-bottom: 1px solid #2a2520;
}
.codeblock pre {
  padding: 16px 20px;
  font-family: var(--mono);
  font-size: 12.5px;
  line-height: 1.85;
  color: #c2b8ae;
  overflow-x: auto;
  white-space: pre;
}
.tok-k  { color: #e2b55e; }  /* key    */
.tok-s  { color: #8fba78; }  /* string */
.tok-n  { color: #d08b5b; }  /* number */
.tok-c  { color: #4a4540; font-style: italic; } /* comment */
.tok-cmd{ color: #79b8ff; }  /* command */
.tok-f  { color: #8fba78; }  /* flag  */
.tok-u  { color: #56b6c2; }  /* url  */
.tok-q  { color: #e2b55e; }  /* quoted string */

/* ─ STATUS TABLE ────────────── */
.stat-wrap { display: grid; grid-template-columns: 1fr 1fr; border: 1px solid var(--line); border-radius: 4px; overflow: hidden; }
.stat-col { padding: 20px 22px; }
.stat-col + .stat-col { border-left: 1px solid var(--line); }
.stat-col-title {
  font-family: var(--mono);
  font-size: 9.5px;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: var(--ink3);
  padding-bottom: 10px;
  margin-bottom: 4px;
  border-bottom: 1px solid var(--line);
}
.srow { display: flex; align-items: baseline; gap: 12px; padding: 6px 0; border-bottom: 1px dotted var(--line); }
.srow:last-child { border-bottom: none; }
.scode { font-family: var(--mono); font-size: 13px; font-weight: 500; min-width: 34px; }
.s2 { color: #059669; } .s3 { color: #2563eb; } .s4 { color: #d97706; } .s5 { color: #dc2626; }
.sdesc { font-size: 13px; color: var(--ink2); flex: 1; }
.strig { font-family: var(--mono); font-size: 10.5px; color: var(--ink3); }

/* ─ PARAM TABLE ─────────────── */
.ptable { width: 100%; border-collapse: collapse; }
.ptable tr { border-bottom: 1px solid var(--line); }
.ptable tr:last-child { border-bottom: none; }
.ptable td { padding: 10px 0; font-size: 13.5px; vertical-align: top; }
.ptable td:first-child { font-family: var(--mono); font-size: 12px; color: var(--blue); width: 210px; padding-right: 20px; }
.ptable td:last-child { color: var(--ink2); font-weight: 300; }
.ptable code { font-family: var(--mono); font-size: 11.5px; background: var(--paper2); padding: 1px 6px; border-radius: 2px; }

/* ─ AUTH CALLOUT ────────────── */
.callout {
  border-left: 3px solid var(--red);
  background: var(--paper2);
  padding: 18px 22px;
  border-radius: 0 4px 4px 0;
}
.callout p { font-size: 14px; color: var(--ink2); font-weight: 300; line-height: 1.75; margin-bottom: 9px; }
.callout p:last-child { margin: 0; }
.callout strong { color: var(--ink); font-weight: 500; }
.callout code { font-family: var(--mono); font-size: 11.5px; background: var(--line); padding: 1px 6px; border-radius: 2px; color: var(--ink); }
.warn { color: var(--red) !important; }

/* ─ FOOTER ──────────────────── */
.footer {
  border-top: 2px solid var(--ink);
  padding: 22px 40px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}
.footer-brand {
  font-family: var(--serif);
  font-size: 1.15rem;
  font-style: italic;
  color: var(--ink);
}
.footer-links {
  display: flex;
  gap: 24px;
  font-family: var(--mono);
  font-size: 11px;
  color: var(--ink3);
}
.footer-links a { color: var(--ink3); text-decoration: none; border-bottom: 1px solid var(--line); padding-bottom: 1px; transition: color .12s, border-color .12s; }
.footer-links a:hover { color: var(--ink); border-color: var(--ink); }

@media (max-width: 760px) {
  .hero { grid-template-columns: 1fr; gap: 36px; padding: 48px 24px 40px; }
  .hero-panel { border-left: none; border-top: 1px solid var(--line); padding-left: 0; padding-top: 28px; }
  .body-grid { grid-template-columns: 1fr; }
  .sidenav { display: none; }
  .content { padding: 32px 24px 48px; }
  .stat-wrap { grid-template-columns: 1fr; }
  .stat-col + .stat-col { border-left: none; border-top: 1px solid var(--line); }
  .topbar, .footer { padding-left: 24px; padding-right: 24px; }
}
</style>
</head>
<body>

<!-- TOP BAR -->
<div class="topbar">
  <div class="topbar-live">
    <span class="live-dot"></span>
    API online
  </div>
  <span>gorest.in &mdash; free mock REST API</span>
</div>

<div class="wrap">

  <!-- HERO -->
  <section class="hero">
    <div>
      <h1 class="hero-title">Free<br><span class="italic">Mock</span><br>API.</h1>
      <p class="hero-subtitle">A drop-in replacement for gorest.co.in &mdash; built for QA &amp; SDET students who need a reliable endpoint to test against. Full CRUD. Real HTTP responses. No account required.</p>
      <div class="url-box">
        <span class="url-label">Base URL</span>
        https://gorest.in/public/v2/users
      </div>
      <div class="chips">
        <span class="chip">REST</span>
        <span class="chip">CRUD</span>
        <span class="chip">JSON</span>
        <span class="chip">Pagination</span>
        <span class="chip">Bearer Auth</span>
        <span class="chip">13 Status Codes</span>
        <span class="chip">Rate Limiting</span>
      </div>
    </div>
    <div class="hero-panel">
      <div class="panel-label">API Info</div>
      <div class="panel-stat"><span class="key">Status</span><span class="val green">&#9679; Operational</span></div>
      <div class="panel-stat"><span class="key">Seed users</span><span class="val">20 (IDs 1001–1020)</span></div>
      <div class="panel-stat"><span class="key">Rate limit</span><span class="val">60 req / min</span></div>
      <div class="panel-stat"><span class="key">Auth required</span><span class="val">POST / PUT / PATCH / DELETE</span></div>
      <div class="panel-stat"><span class="key">Replaces</span><span class="val">gorest.co.in</span></div>
      <div class="panel-stat"><span class="key">Built by</span><span class="val">Naveen AutomationLabs</span></div>
    </div>
  </section>

  <!-- BODY -->
  <div class="body-grid">

    <!-- SIDENAV -->
    <nav class="sidenav">
      <div class="sidenav-title">Contents</div>
      <a href="#endpoints">Endpoints</a>
      <a href="#auth">Auth</a>
      <a href="#schema">Schema</a>
      <a href="#params">Query Params</a>
      <a href="#examples">cURL Examples</a>
      <a href="#status">Status Codes</a>
      <a href="#rate">Rate Limiting</a>
      <a href="#notes">Notes</a>
    </nav>

    <main class="content">

      <!-- 01 ENDPOINTS -->
      <div class="sec" id="endpoints">
        <div class="sec-head">
          <span class="sec-num">01</span>
          <span class="sec-title">Endpoints</span>
        </div>
        <table class="ep">
          <tr>
            <td><span class="badge GET">GET</span></td>
            <td class="ep-path">/public/v2/users</td>
            <td><span class="badge open">public</span></td>
            <td>List all users &mdash; supports pagination &amp; filtering</td>
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
            <td>Full replace &mdash; all fields required</td>
          </tr>
          <tr>
            <td><span class="badge PATCH">PATCH</span></td>
            <td class="ep-path">/public/v2/users/:id</td>
            <td><span class="badge lock">token</span></td>
            <td>Partial update &mdash; send only changed fields</td>
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
        <div class="sec-head">
          <span class="sec-num">02</span>
          <span class="sec-title">Authentication</span>
        </div>
        <div class="callout">
          <p><strong>GET requests are public</strong> &mdash; no token needed. Open them straight in Postman or your browser.</p>
          <p><strong>POST, PUT, PATCH, DELETE</strong> require an <code>Authorization: Bearer &lt;token&gt;</code> header. Any non-empty string works &mdash; <code>demo-token</code>, <code>abc123</code>, your own name, anything.</p>
          <p class="warn">One exception: <code>blocked-token</code> deliberately returns <strong>403 Forbidden</strong> &mdash; useful for testing error-handling flows.</p>
        </div>
      </div>

      <!-- 03 SCHEMA -->
      <div class="sec" id="schema">
        <div class="sec-head">
          <span class="sec-num">03</span>
          <span class="sec-title">User Schema</span>
        </div>
        <div class="codeblock">
          <div class="codeblock-bar">application/json</div>
          <pre>{
  <span class="tok-k">"id"</span>:&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span class="tok-n">1001</span>,
  <span class="tok-k">"name"</span>:&nbsp;&nbsp;&nbsp;<span class="tok-s">"Aarav Sharma"</span>,
  <span class="tok-k">"email"</span>:&nbsp;&nbsp;<span class="tok-s">"aarav.sharma@example.com"</span>,
  <span class="tok-k">"gender"</span>: <span class="tok-s">"male"</span>     <span class="tok-c">// "male" | "female"</span>
  <span class="tok-k">"status"</span>: <span class="tok-s">"active"</span>   <span class="tok-c">// "active" | "inactive"</span>
}</pre>
        </div>
      </div>

      <!-- 04 QUERY PARAMS -->
      <div class="sec" id="params">
        <div class="sec-head">
          <span class="sec-num">04</span>
          <span class="sec-title">Query Parameters</span>
        </div>
        <table class="ptable">
          <tr><td>?name=</td><td>Filter by name (partial match). e.g. <code>?name=aarav</code></td></tr>
          <tr><td>?email=</td><td>Filter by email. e.g. <code>?email=example.com</code></td></tr>
          <tr><td>?gender=</td><td>Filter by gender &mdash; <code>male</code> or <code>female</code></td></tr>
          <tr><td>?status=</td><td>Filter by status &mdash; <code>active</code> or <code>inactive</code></td></tr>
          <tr><td>?page=</td><td>Page number. Default: <code>1</code></td></tr>
          <tr><td>?per_page=</td><td>Results per page. Default: <code>10</code>&nbsp;&nbsp;Max: <code>100</code></td></tr>
        </table>
      </div>

      <!-- 05 CURL -->
      <div class="sec" id="examples">
        <div class="sec-head">
          <span class="sec-num">05</span>
          <span class="sec-title">cURL Examples</span>
        </div>

        <div class="codeblock">
          <div class="codeblock-bar"><span class="badge GET" style="font-size:9.5px;padding:1px 7px">GET</span>&nbsp; List users &mdash; no token needed</div>
          <pre><span class="tok-cmd">curl</span> <span class="tok-u">https://gorest.in/public/v2/users</span></pre>
        </div>

        <div class="codeblock">
          <div class="codeblock-bar"><span class="badge GET" style="font-size:9.5px;padding:1px 7px">GET</span>&nbsp; Paginate &amp; filter</div>
          <pre><span class="tok-cmd">curl</span> <span class="tok-q">"https://gorest.in/public/v2/users?page=1&per_page=10&status=active"</span></pre>
        </div>

        <div class="codeblock">
          <div class="codeblock-bar"><span class="badge GET" style="font-size:9.5px;padding:1px 7px">GET</span>&nbsp; Single user by ID</div>
          <pre><span class="tok-cmd">curl</span> <span class="tok-u">https://gorest.in/public/v2/users/1001</span></pre>
        </div>

        <div class="codeblock">
          <div class="codeblock-bar"><span class="badge POST" style="font-size:9.5px;padding:1px 7px">POST</span>&nbsp; Create user</div>
          <pre><span class="tok-cmd">curl</span> <span class="tok-f">-X POST</span> https://gorest.in/public/v2/users \
  <span class="tok-f">-H</span> <span class="tok-q">"Content-Type: application/json"</span> \
  <span class="tok-f">-H</span> <span class="tok-q">"Authorization: Bearer demo-token"</span> \
  <span class="tok-f">-d</span> <span class="tok-q">'{"name":"Naveen Kumar","email":"nk@test.com","gender":"male","status":"active"}'</span></pre>
        </div>

        <div class="codeblock">
          <div class="codeblock-bar"><span class="badge PATCH" style="font-size:9.5px;padding:1px 7px">PATCH</span>&nbsp; Partial update</div>
          <pre><span class="tok-cmd">curl</span> <span class="tok-f">-X PATCH</span> https://gorest.in/public/v2/users/1001 \
  <span class="tok-f">-H</span> <span class="tok-q">"Content-Type: application/json"</span> \
  <span class="tok-f">-H</span> <span class="tok-q">"Authorization: Bearer demo-token"</span> \
  <span class="tok-f">-d</span> <span class="tok-q">'{"status":"inactive"}'</span></pre>
        </div>

        <div class="codeblock">
          <div class="codeblock-bar"><span class="badge DELETE" style="font-size:9.5px;padding:1px 7px">DELETE</span>&nbsp; Delete user</div>
          <pre><span class="tok-cmd">curl</span> <span class="tok-f">-X DELETE</span> https://gorest.in/public/v2/users/1001 \
  <span class="tok-f">-H</span> <span class="tok-q">"Authorization: Bearer demo-token"</span></pre>
        </div>

      </div>

      <!-- 06 STATUS CODES -->
      <div class="sec" id="status">
        <div class="sec-head">
          <span class="sec-num">06</span>
          <span class="sec-title">HTTP Status Codes</span>
        </div>
        <div class="stat-wrap">
          <div class="stat-col">
            <div class="stat-col-title">2xx &mdash; 3xx &nbsp; Success</div>
            <div class="srow"><span class="scode s2">200</span><span class="sdesc">OK</span><span class="strig">GET / PUT / PATCH</span></div>
            <div class="srow"><span class="scode s2">201</span><span class="sdesc">Created</span><span class="strig">POST</span></div>
            <div class="srow"><span class="scode s2">204</span><span class="sdesc">No Content</span><span class="strig">DELETE</span></div>
            <div class="srow"><span class="scode s3">304</span><span class="sdesc">Not Modified</span><span class="strig">ETag cache hit</span></div>
          </div>
          <div class="stat-col">
            <div class="stat-col-title">4xx &mdash; 5xx &nbsp; Errors</div>
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

      <!-- 07 RATE LIMITING -->
      <div class="sec" id="rate">
        <div class="sec-head">
          <span class="sec-num">07</span>
          <span class="sec-title">Rate Limiting</span>
        </div>
        <table class="ptable">
          <tr><td>X-RateLimit-Limit</td><td>Max requests per minute &mdash; <strong>60</strong></td></tr>
          <tr><td>X-RateLimit-Remaining</td><td>Requests left in the current window</td></tr>
          <tr><td>X-RateLimit-Reset</td><td>Seconds until the window resets</td></tr>
        </table>
      </div>

      <!-- 08 NOTES -->
      <div class="sec" id="notes">
        <div class="sec-head">
          <span class="sec-num">08</span>
          <span class="sec-title">Notes</span>
        </div>
        <table class="ptable">
          <tr><td>Seed data</td><td>20 pre-loaded users, IDs 1001&ndash;1020. New users auto-increment from 1021.</td></tr>
          <tr><td>Persistence</td><td>In-memory only &mdash; resets on server restart. Intentional; clean slate every session.</td></tr>
          <tr><td>Duplicate email</td><td>Returns 422 with a field-level validation message.</td></tr>
          <tr><td>Pagination headers</td><td><code>X-Pagination-Total</code> &nbsp;<code>X-Pagination-Pages</code> &nbsp;<code>X-Pagination-Page</code> &nbsp;<code>X-Pagination-Limit</code></td></tr>
          <tr><td>Replaces</td><td>gorest.co.in &mdash; same URL structure, compatible with existing Postman collections.</td></tr>
        </table>
      </div>

    </main>
  </div>

  <!-- FOOTER -->
  <footer class="footer">
    <div class="footer-brand">Built for the QA community.</div>
    <div class="footer-links">
      <a href="https://www.youtube.com/@naveenAutomationLabs" target="_blank">Naveen AutomationLabs &nearr;</a>
      <a href="https://gorest.in/public/v2/users" target="_blank">Try the API &nearr;</a>
      <span>Free forever</span>
    </div>
  </footer>

</div>
</body>
</html>`);


});

// ─── GET /public/v2/users ─────────────────────────────────────────────────────
app.get("/public/v2/users", (req, res) => {
  let result = [...users];

  // 304 — ETag / If-None-Match caching support
  const etag = `"users-${users.length}-${nextId}"`;
  res.set("ETag", etag);
  if (req.headers["if-none-match"] === etag) {
    return res.status(304).end();
  }

  // Filtering
  if (req.query.name) result = result.filter((u) => u.name.toLowerCase().includes(req.query.name.toLowerCase()));
  if (req.query.email) result = result.filter((u) => u.email.toLowerCase().includes(req.query.email.toLowerCase()));
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
  res.status(200).json(paginated);
});

// ─── POST /public/v2/users ────────────────────────────────────────────────────
app.post("/public/v2/users", (req, res) => {
  const errors = validateUser(req.body, true);
  if (errors.length) return res.status(422).json(errors);

  const user = {
    id: nextId++,
    name: req.body.name.trim(),
    email: req.body.email.trim().toLowerCase(),
    gender: req.body.gender,
    status: req.body.status,
  };
  users.push(user);
  res.status(201).json(user);
});

// ─── GET /public/v2/users/:id ─────────────────────────────────────────────────
app.get("/public/v2/users/:id", (req, res) => {
  const user = users.find((u) => u.id === parseInt(req.params.id));
  if (!user) return res.status(404).json({ message: "Resource not found" });
  res.status(200).json(user);
});

// ─── PUT /public/v2/users/:id ────────────────────────────────────────────────
app.put("/public/v2/users/:id", (req, res) => {
  const idx = users.findIndex((u) => u.id === parseInt(req.params.id));
  if (idx === -1) return res.status(404).json({ message: "Resource not found" });

  // For PUT, validate all fields (exclude current user's email from duplicate check)
  const currentEmail = users[idx].email;
  const bodyCopy = { ...req.body };
  const tempUsers = users.filter((_, i) => i !== idx);
  const savedUsers = users;
  users = tempUsers;
  const errors = validateUser(bodyCopy, true);
  users = savedUsers;
  if (errors.length) return res.status(422).json(errors);

  users[idx] = {
    id: users[idx].id,
    name: req.body.name.trim(),
    email: req.body.email.trim().toLowerCase(),
    gender: req.body.gender,
    status: req.body.status,
  };
  res.status(200).json(users[idx]);
});

// ─── PATCH /public/v2/users/:id ──────────────────────────────────────────────
app.patch("/public/v2/users/:id", (req, res) => {
  const idx = users.findIndex((u) => u.id === parseInt(req.params.id));
  if (idx === -1) return res.status(404).json({ message: "Resource not found" });

  // Partial validate — only fields sent
  const savedUsers = users;
  const tempUsers = users.filter((_, i) => i !== idx);
  users = tempUsers;
  const errors = validateUser(req.body, false);
  users = savedUsers;
  if (errors.length) return res.status(422).json(errors);

  if (req.body.name !== undefined) users[idx].name = req.body.name.trim();
  if (req.body.email !== undefined) users[idx].email = req.body.email.trim().toLowerCase();
  if (req.body.gender !== undefined) users[idx].gender = req.body.gender;
  if (req.body.status !== undefined) users[idx].status = req.body.status;

  res.status(200).json(users[idx]);
});

// ─── DELETE /public/v2/users/:id ─────────────────────────────────────────────
app.delete("/public/v2/users/:id", (req, res) => {
  const idx = users.findIndex((u) => u.id === parseInt(req.params.id));
  if (idx === -1) return res.status(404).json({ message: "Resource not found" });
  users.splice(idx, 1);
  res.status(204).send();
});

// ─── 405 Method Not Allowed ───────────────────────────────────────────────────
// Catch unsupported methods on known paths
app.all("/public/v2/users", (req, res) => {
  res.set("Allow", "GET, POST");
  res.status(405).json({ message: `Method ${req.method} not allowed on this endpoint. Allowed: GET, POST` });
});

app.all("/public/v2/users/:id", (req, res) => {
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

