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
<title>GoRest.in — Free Mock REST API for QA & SDET Students</title>
<meta name="description" content="Free mock REST API for QA and SDET students. Drop-in replacement for GoRest. Full CRUD on Users. No signup needed. Built by Naveen AutomationLabs.">
<link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&family=Syne:wght@400;600;800&display=swap" rel="stylesheet">
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{background:#0a0d13;color:#e2e8f0;font-family:'Syne',sans-serif;min-height:100vh}

  /* Hero */
  .hero{background:linear-gradient(135deg,#0d1525 0%,#0a0d13 70%);border-bottom:1px solid #1e2640;padding:64px 40px 56px}
  .hero-inner{max-width:960px;margin:0 auto}
  .badge{display:inline-flex;align-items:center;gap:8px;background:#0f1e36;border:1px solid #1e3a5a;border-radius:20px;padding:6px 16px;font-size:12px;color:#64b5f6;font-family:'JetBrains Mono',monospace;margin-bottom:28px;letter-spacing:.5px}
  .dot{width:7px;height:7px;background:#4caf50;border-radius:50%;animation:pulse 2s infinite;flex-shrink:0}
  @keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.5;transform:scale(.85)}}
  h1{font-size:clamp(2.2rem,5vw,3.8rem);font-weight:800;line-height:1.1;margin-bottom:16px}
  h1 span.brand{background:linear-gradient(135deg,#ffffff 0%,#64b5f6 60%,#42a5f5 100%);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
  h1 span.tld{background:linear-gradient(135deg,#f97316 0%,#fb923c 100%);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
  .subtitle{color:#94a3b8;font-size:1.1rem;max-width:620px;line-height:1.7;margin-bottom:28px}
  .hero-tags{display:flex;flex-wrap:wrap;gap:10px}
  .tag{background:#111828;border:1px solid #1e2e48;border-radius:6px;padding:5px 12px;font-size:12px;font-family:'JetBrains Mono',monospace;color:#64b5f6}

  /* Layout */
  .container{max-width:960px;margin:0 auto;padding:48px 40px}
  .section{margin-bottom:52px}
  h2{font-size:.8rem;font-weight:700;text-transform:uppercase;letter-spacing:4px;color:#4a90e2;margin-bottom:20px;display:flex;align-items:center;gap:12px}
  h2::after{content:'';flex:1;height:1px;background:linear-gradient(90deg,#1e2640 0%,transparent 100%)}

  /* Base URL */
  .base-url-box{background:#0d1525;border:1px solid #1e3a5a;border-radius:10px;padding:18px 24px;font-family:'JetBrains Mono',monospace;font-size:15px;color:#64b5f6;letter-spacing:.3px;display:flex;align-items:center;gap:12px}
  .base-url-box::before{content:'GET';background:#1a3a1a;color:#4caf50;border:1px solid #2a5a2a;border-radius:4px;padding:2px 8px;font-size:11px;font-weight:600;flex-shrink:0}

  /* Endpoint table */
  .endpoint-table{width:100%;border-collapse:collapse;font-family:'JetBrains Mono',monospace;font-size:13px}
  .endpoint-table thead tr{border-bottom:2px solid #1e2640}
  .endpoint-table thead td{padding:8px 16px;font-size:11px;text-transform:uppercase;letter-spacing:2px;color:#4a6080}
  .endpoint-table tbody tr{border-bottom:1px solid #111828;transition:background .15s}
  .endpoint-table tbody tr:hover{background:#0e1520}
  .endpoint-table td{padding:13px 16px;vertical-align:middle}
  .method{display:inline-block;padding:3px 10px;border-radius:4px;font-weight:600;font-size:11px;min-width:58px;text-align:center;letter-spacing:.5px}
  .GET{background:#0f2a0f;color:#4caf50;border:1px solid #1e4a1e}
  .POST{background:#0f1e30;color:#64b5f6;border:1px solid #1e3a5a}
  .PUT{background:#1e1a0a;color:#ffd54f;border:1px solid #3a300a}
  .PATCH{background:#1a180a;color:#ffcc80;border:1px solid #352e0a}
  .DELETE{background:#1e0a0a;color:#ef9a9a;border:1px solid #3a1a1a}
  .auth-badge{display:inline-block;font-size:10px;padding:2px 7px;border-radius:3px;margin-left:8px;font-family:'JetBrains Mono',monospace}
  .auth-req{background:#1e1a0a;color:#ffd54f;border:1px solid #3a300a}
  .auth-pub{background:#0f1e30;color:#64b5f6;border:1px solid #1e3a5a}
  .path{color:#e2e8f0;font-size:13px}
  .desc{color:#64748b;font-family:'Syne',sans-serif;font-size:13px}

  /* Code blocks */
  .code-block{background:#080c12;border:1px solid #141e2e;border-radius:8px;overflow:hidden}
  .code-header{background:#0d1525;padding:8px 16px;font-size:11px;font-family:'JetBrains Mono',monospace;color:#4a6080;border-bottom:1px solid #141e2e;letter-spacing:1px;text-transform:uppercase}
  .code-body{padding:18px 20px;font-family:'JetBrains Mono',monospace;font-size:13px;line-height:1.8;overflow-x:auto}
  .k{color:#ce9178}.vs{color:#98c379}.vn{color:#d19a66}.cm{color:#4a5568}.cmd{color:#94a3b8}.flag{color:#64b5f6}.url{color:#4caf50}

  /* Grid cards */
  .grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}
  .grid-3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px}
  @media(max-width:700px){.grid,.grid-3{grid-template-columns:1fr}}
  .card{background:#0d1117;border:1px solid #141e2e;border-radius:8px;padding:18px 20px}
  .card h3{font-size:11px;text-transform:uppercase;letter-spacing:2.5px;color:#4a90e2;margin-bottom:14px;font-weight:600}
  .card ul{list-style:none;color:#94a3b8;font-size:13px;line-height:2}
  .card ul li{display:flex;align-items:flex-start;gap:8px}
  .card ul li::before{content:'→';color:#4a90e2;flex-shrink:0;margin-top:1px}
  .card ul li code{font-family:'JetBrains Mono',monospace;color:#64b5f6;font-size:12px}

  /* Status codes table */
  .status-table{width:100%;border-collapse:collapse;font-size:13px}
  .status-table tr{border-bottom:1px solid #111828}
  .status-table tr:hover{background:#0e1520}
  .status-table td{padding:11px 14px;vertical-align:top}
  .status-table td:first-child{font-family:'JetBrains Mono',monospace;font-weight:600;min-width:50px}
  .s2{color:#4caf50}.s3{color:#64b5f6}.s4{color:#ffd54f}.s5{color:#ef9a9a}
  .status-desc{color:#64748b;font-size:12px;margin-top:2px}

  /* Note box */
  .note{background:#0f1e10;border:1px solid #1a3a1a;border-left:3px solid #4caf50;border-radius:6px;padding:14px 18px;font-size:13px;color:#94a3b8;line-height:1.7}
  .note strong{color:#4caf50}

  footer{text-align:center;padding:32px 20px;color:#2d3748;font-size:12px;font-family:'JetBrains Mono',monospace;border-top:1px solid #0e1520}
  footer a{color:#4a6080;text-decoration:none}
  footer a:hover{color:#64b5f6}
</style>
</head>
<body>

<div class="hero">
  <div class="hero-inner">
    <div class="badge"><span class="dot"></span> API ONLINE &nbsp;·&nbsp; gorest.in</div>
    <h1><span class="brand">GoRest</span><span class="tld">.in</span></h1>
    <p class="subtitle">A free mock REST API for QA &amp; SDET students. Drop-in replacement for gorest.co.in — full CRUD on Users, real HTTP responses, no signup needed.</p>
    <div class="hero-tags">
      <span class="tag">REST API</span>
      <span class="tag">CRUD</span>
      <span class="tag">JSON</span>
      <span class="tag">Pagination</span>
      <span class="tag">Bearer Auth</span>
      <span class="tag">Rate Limiting</span>
      <span class="tag">Free Forever</span>
    </div>
  </div>
</div>

<div class="container">

  <!-- Base URL -->
  <div class="section">
    <h2>Base URL</h2>
    <div class="base-url-box">https://gorest.in/public/v2/users</div>
  </div>

  <!-- Endpoints -->
  <div class="section">
    <h2>User Endpoints</h2>
    <table class="endpoint-table">
      <thead><tr><td>Method</td><td>Endpoint</td><td>Auth</td><td>Description</td></tr></thead>
      <tbody>
        <tr><td><span class="method GET">GET</span></td><td class="path">/public/v2/users</td><td><span class="auth-badge auth-pub">public</span></td><td class="desc">List all users (paginated)</td></tr>
        <tr><td><span class="method POST">POST</span></td><td class="path">/public/v2/users</td><td><span class="auth-badge auth-req">token</span></td><td class="desc">Create a new user</td></tr>
        <tr><td><span class="method GET">GET</span></td><td class="path">/public/v2/users/:id</td><td><span class="auth-badge auth-pub">public</span></td><td class="desc">Get user by ID</td></tr>
        <tr><td><span class="method PUT">PUT</span></td><td class="path">/public/v2/users/:id</td><td><span class="auth-badge auth-req">token</span></td><td class="desc">Replace user (full update)</td></tr>
        <tr><td><span class="method PATCH">PATCH</span></td><td class="path">/public/v2/users/:id</td><td><span class="auth-badge auth-req">token</span></td><td class="desc">Update user (partial)</td></tr>
        <tr><td><span class="method DELETE">DELETE</span></td><td class="path">/public/v2/users/:id</td><td><span class="auth-badge auth-req">token</span></td><td class="desc">Delete user</td></tr>
      </tbody>
    </table>
  </div>

  <!-- Auth -->
  <div class="section">
    <h2>Authentication</h2>
    <div class="note">
      <strong>GET requests are public</strong> — no token needed.<br>
      <strong>POST, PUT, PATCH, DELETE</strong> require an <code style="color:#64b5f6;font-family:'JetBrains Mono',monospace">Authorization: Bearer &lt;token&gt;</code> header.<br>
      Any non-empty token is accepted. Use <code style="color:#64b5f6;font-family:'JetBrains Mono',monospace">demo-token</code>, <code style="color:#64b5f6;font-family:'JetBrains Mono',monospace">abc123</code>, or anything you like.<br>
      Only <code style="color:#ef9a9a;font-family:'JetBrains Mono',monospace">blocked-token</code> is rejected → returns <strong style="color:#ef9a9a">403 Forbidden</strong> (useful for testing).
    </div>
  </div>

  <!-- User Schema -->
  <div class="section">
    <h2>User Schema</h2>
    <div class="code-block">
      <div class="code-header">JSON Response</div>
      <div class="code-body">{<br>
&nbsp;&nbsp;<span class="k">"id"</span>:&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span class="vn">1001</span>,<br>
&nbsp;&nbsp;<span class="k">"name"</span>:&nbsp;&nbsp;&nbsp;<span class="vs">"Aarav Sharma"</span>,<br>
&nbsp;&nbsp;<span class="k">"email"</span>:&nbsp;&nbsp;<span class="vs">"aarav.sharma@example.com"</span>,<br>
&nbsp;&nbsp;<span class="k">"gender"</span>: <span class="vs">"male"</span>&nbsp;&nbsp;&nbsp;&nbsp;<span class="cm">// "male" | "female"</span><br>
&nbsp;&nbsp;<span class="k">"status"</span>: <span class="vs">"active"</span>&nbsp;&nbsp;<span class="cm">// "active" | "inactive"</span><br>
}</div>
    </div>
  </div>

  <!-- Query Params -->
  <div class="section">
    <h2>Query Parameters</h2>
    <div class="grid">
      <div class="card">
        <h3>Filtering</h3>
        <ul>
          <li><code>?name=aarav</code></li>
          <li><code>?email=example.com</code></li>
          <li><code>?gender=male</code></li>
          <li><code>?status=active</code></li>
        </ul>
      </div>
      <div class="card">
        <h3>Pagination</h3>
        <ul>
          <li><code>?page=1</code></li>
          <li><code>?per_page=10</code> &nbsp;(max 100)</li>
          <li><code>X-Pagination-Total</code></li>
          <li><code>X-Pagination-Pages</code></li>
          <li><code>X-Pagination-Page</code></li>
          <li><code>X-Pagination-Limit</code></li>
        </ul>
      </div>
    </div>
  </div>

  <!-- cURL Examples -->
  <div class="section">
    <h2>cURL Examples</h2>
    <div style="display:flex;flex-direction:column;gap:16px">

      <div class="code-block">
        <div class="code-header">GET — List users (public)</div>
        <div class="code-body"><span class="cmd">curl</span> <span class="url">https://gorest.in/public/v2/users</span></div>
      </div>

      <div class="code-block">
        <div class="code-header">GET — With pagination &amp; filters</div>
        <div class="code-body"><span class="cmd">curl</span> <span class="vs">"https://gorest.in/public/v2/users?page=1&amp;per_page=10&amp;status=active"</span></div>
      </div>

      <div class="code-block">
        <div class="code-header">GET — Single user by ID (public)</div>
        <div class="code-body"><span class="cmd">curl</span> <span class="url">https://gorest.in/public/v2/users/1001</span></div>
      </div>

      <div class="code-block">
        <div class="code-header">POST — Create user (token required)</div>
        <div class="code-body"><span class="cmd">curl</span> <span class="flag">-X POST</span> https://gorest.in/public/v2/users \<br>
&nbsp;&nbsp;<span class="flag">-H</span> <span class="vs">"Content-Type: application/json"</span> \<br>
&nbsp;&nbsp;<span class="flag">-H</span> <span class="vs">"Authorization: Bearer demo-token"</span> \<br>
&nbsp;&nbsp;<span class="flag">-d</span> <span class="vs">'{"name":"Naveen Kumar","email":"naveen@example.com","gender":"male","status":"active"}'</span></div>
      </div>

      <div class="code-block">
        <div class="code-header">PATCH — Partial update (token required)</div>
        <div class="code-body"><span class="cmd">curl</span> <span class="flag">-X PATCH</span> https://gorest.in/public/v2/users/1001 \<br>
&nbsp;&nbsp;<span class="flag">-H</span> <span class="vs">"Content-Type: application/json"</span> \<br>
&nbsp;&nbsp;<span class="flag">-H</span> <span class="vs">"Authorization: Bearer demo-token"</span> \<br>
&nbsp;&nbsp;<span class="flag">-d</span> <span class="vs">'{"status":"inactive"}'</span></div>
      </div>

      <div class="code-block">
        <div class="code-header">DELETE — Delete user (token required)</div>
        <div class="code-body"><span class="cmd">curl</span> <span class="flag">-X DELETE</span> https://gorest.in/public/v2/users/1001 \<br>
&nbsp;&nbsp;<span class="flag">-H</span> <span class="vs">"Authorization: Bearer demo-token"</span></div>
      </div>

    </div>
  </div>

  <!-- HTTP Status Codes -->
  <div class="section">
    <h2>HTTP Status Codes</h2>
    <div class="grid">
      <div class="card">
        <h3>Success 2xx / 3xx</h3>
        <table class="status-table">
          <tr><td class="s2">200</td><td>OK — successful GET, PUT, PATCH</td></tr>
          <tr><td class="s2">201</td><td>Created — successful POST</td></tr>
          <tr><td class="s2">204</td><td>No Content — successful DELETE</td></tr>
          <tr><td class="s3">304</td><td>Not Modified — ETag cache hit</td></tr>
        </table>
      </div>
      <div class="card">
        <h3>Client Errors 4xx</h3>
        <table class="status-table">
          <tr><td class="s4">400</td><td>Bad Request — invalid JSON body</td></tr>
          <tr><td class="s4">401</td><td>Unauthorized — missing token</td></tr>
          <tr><td class="s4">403</td><td>Forbidden — blocked-token used</td></tr>
          <tr><td class="s4">404</td><td>Not Found — user ID doesn't exist</td></tr>
          <tr><td class="s4">405</td><td>Method Not Allowed</td></tr>
          <tr><td class="s4">415</td><td>Unsupported Media Type</td></tr>
          <tr><td class="s4">422</td><td>Validation Failed — check fields</td></tr>
          <tr><td class="s4">429</td><td>Too Many Requests — rate limited</td></tr>
          <tr><td class="s5">500</td><td>Internal Server Error</td></tr>
        </table>
      </div>
    </div>
  </div>

  <!-- Rate Limiting -->
  <div class="section">
    <h2>Rate Limiting</h2>
    <div class="card">
      <h3>Headers returned on every request</h3>
      <ul>
        <li><code>X-RateLimit-Limit</code> &nbsp;— max requests per minute (60)</li>
        <li><code>X-RateLimit-Remaining</code> &nbsp;— requests left in current window</li>
        <li><code>X-RateLimit-Reset</code> &nbsp;— seconds until window resets</li>
      </ul>
    </div>
  </div>

  <!-- Notes -->
  <div class="section">
    <h2>Notes</h2>
    <div class="note">
      <strong>Seed data:</strong> 20 pre-loaded users (IDs 1001–1020). New users start from ID 1021.<br>
      <strong>Data persistence:</strong> Data lives in memory — resets on server restart. Clean slate every time.<br>
      <strong>Duplicate emails:</strong> Attempting to create a user with an existing email returns 422.<br>
      <strong>Rate limit:</strong> 60 requests/minute per IP. Exceeding returns 429.<br>
      <strong>Open source:</strong> Built by <a href="https://www.youtube.com/@naveenAutomationLabs" target="_blank" style="color:#64b5f6">Naveen AutomationLabs</a> for the QA community.
    </div>
  </div>

</div>
<footer>
  Built with ❤️ by <a href="https://www.youtube.com/@naveenAutomationLabs" target="_blank">Naveen AutomationLabs</a>
  &nbsp;·&nbsp; Free for the QA &amp; SDET community
  &nbsp;·&nbsp; <a href="https://gorest.in/public/v2/users" target="_blank">Try the API →</a>
</footer>
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

