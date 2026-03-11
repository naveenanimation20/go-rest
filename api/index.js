const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

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

// ─── Homepage ─────────────────────────────────────────────────────────────────
app.get("/", (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>NAL Mock API</title>
<link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600&family=Syne:wght@400;700;800&display=swap" rel="stylesheet">
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{background:#0a0d13;color:#e2e8f0;font-family:'Syne',sans-serif;min-height:100vh}
  .hero{background:linear-gradient(135deg,#0f1729 0%,#0a0d13 60%);border-bottom:1px solid #1e2640;padding:60px 40px 50px}
  .badge{display:inline-flex;align-items:center;gap:8px;background:#1a2540;border:1px solid #2a3a60;border-radius:20px;padding:6px 16px;font-size:12px;color:#64b5f6;font-family:'JetBrains Mono',monospace;margin-bottom:24px}
  .dot{width:8px;height:8px;background:#4caf50;border-radius:50%;animation:pulse 2s infinite}
  @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
  h1{font-size:clamp(2rem,5vw,3.5rem);font-weight:800;background:linear-gradient(135deg,#fff 0%,#64b5f6 100%);-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin-bottom:12px}
  .subtitle{color:#718096;font-size:1.1rem;max-width:600px;line-height:1.6}
  .container{max-width:900px;margin:0 auto;padding:40px}
  .section{margin-bottom:48px}
  h2{font-size:1rem;font-weight:700;text-transform:uppercase;letter-spacing:3px;color:#4a90e2;margin-bottom:20px;display:flex;align-items:center;gap:10px}
  h2::after{content:'';flex:1;height:1px;background:linear-gradient(90deg,#1e2640,transparent)}
  .endpoint-table{width:100%;border-collapse:collapse;font-family:'JetBrains Mono',monospace;font-size:13px}
  .endpoint-table tr{border-bottom:1px solid #1a2030;transition:background .15s}
  .endpoint-table tr:hover{background:#111828}
  .endpoint-table td{padding:14px 16px;vertical-align:middle}
  .method{display:inline-block;padding:3px 10px;border-radius:4px;font-weight:600;font-size:11px;min-width:60px;text-align:center}
  .GET{background:#1a3a1a;color:#4caf50;border:1px solid #2a5a2a}
  .POST{background:#1a2a3a;color:#64b5f6;border:1px solid #2a4a6a}
  .PUT,.PATCH{background:#2a2a1a;color:#ffd54f;border:1px solid #4a4a1a}
  .DELETE{background:#2a1a1a;color:#ef9a9a;border:1px solid #4a2a2a}
  .path{color:#e2e8f0}
  .desc{color:#718096;font-family:'Syne',sans-serif;font-size:13px}
  .code-block{background:#0d1117;border:1px solid #1e2640;border-radius:8px;padding:20px;font-family:'JetBrains Mono',monospace;font-size:13px;overflow-x:auto;line-height:1.7}
  .code-block .key{color:#ce9178}
  .code-block .val-str{color:#98c379}
  .code-block .val-num{color:#d19a66}
  .base-url{background:#111828;border:1px solid #2a3a5a;border-radius:8px;padding:16px 20px;font-family:'JetBrains Mono',monospace;font-size:14px;color:#64b5f6;margin-bottom:32px}
  .grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}
  @media(max-width:640px){.grid{grid-template-columns:1fr}}
  .info-card{background:#111520;border:1px solid #1e2640;border-radius:8px;padding:16px 20px}
  .info-card h3{font-size:12px;text-transform:uppercase;letter-spacing:2px;color:#4a90e2;margin-bottom:10px}
  .info-card ul{list-style:none;color:#94a3b8;font-size:13px;line-height:1.9}
  .info-card ul li::before{content:'→ ';color:#4a90e2}
  footer{text-align:center;padding:30px;color:#374151;font-size:12px;font-family:'JetBrains Mono',monospace;border-top:1px solid #111828}
</style>
</head>
<body>
<div class="hero">
  <div style="max-width:900px;margin:0 auto">
    <div class="badge"><span class="dot"></span> API ONLINE — NAL MOCK REST API</div>
    <h1>NAL Mock API</h1>
    <p class="subtitle">A free mock REST API for QA & SDET students to practice test automation. Full CRUD on Users. No signup needed.</p>
  </div>
</div>
<div class="container">
  <div class="section">
    <h2>Base URL</h2>
    <div class="base-url">https://&lt;your-deployment-url&gt;/public/v2/users</div>
  </div>

  <div class="section">
    <h2>User Endpoints</h2>
    <table class="endpoint-table">
      <tr><td><span class="method GET">GET</span></td><td class="path">/public/v2/users</td><td class="desc">List all users (paginated)</td></tr>
      <tr><td><span class="method POST">POST</span></td><td class="path">/public/v2/users</td><td class="desc">Create a new user</td></tr>
      <tr><td><span class="method GET">GET</span></td><td class="path">/public/v2/users/:id</td><td class="desc">Get user by ID</td></tr>
      <tr><td><span class="method PUT">PUT</span></td><td class="path">/public/v2/users/:id</td><td class="desc">Replace user (full update)</td></tr>
      <tr><td><span class="method PATCH">PATCH</span></td><td class="path">/public/v2/users/:id</td><td class="desc">Update user (partial)</td></tr>
      <tr><td><span class="method DELETE">DELETE</span></td><td class="path">/public/v2/users/:id</td><td class="desc">Delete user</td></tr>
    </table>
  </div>

  <div class="section">
    <h2>Query Parameters</h2>
    <div class="grid">
      <div class="info-card">
        <h3>Filtering</h3>
        <ul>
          <li>?name=aarav</li>
          <li>?email=test@example.com</li>
          <li>?gender=male</li>
          <li>?status=active</li>
        </ul>
      </div>
      <div class="info-card">
        <h3>Pagination</h3>
        <ul>
          <li>?page=1</li>
          <li>?per_page=10 (max 100)</li>
          <li>X-Pagination-Total header</li>
          <li>X-Pagination-Pages header</li>
        </ul>
      </div>
    </div>
  </div>

  <div class="section">
    <h2>User Schema</h2>
    <div class="code-block">
{<br>
&nbsp;&nbsp;<span class="key">"id"</span>: <span class="val-num">1001</span>,<br>
&nbsp;&nbsp;<span class="key">"name"</span>: <span class="val-str">"Aarav Sharma"</span>,<br>
&nbsp;&nbsp;<span class="key">"email"</span>: <span class="val-str">"aarav.sharma@example.com"</span>,<br>
&nbsp;&nbsp;<span class="key">"gender"</span>: <span class="val-str">"male"</span>&nbsp;&nbsp;&nbsp;&nbsp;<span style="color:#555">// "male" | "female"</span><br>
&nbsp;&nbsp;<span class="key">"status"</span>: <span class="val-str">"active"</span>&nbsp;&nbsp;<span style="color:#555">// "active" | "inactive"</span><br>
}
    </div>
  </div>

  <div class="section">
    <h2>HTTP Status Codes</h2>
    <div class="grid">
      <div class="info-card">
        <h3>Success</h3>
        <ul>
          <li>200 — OK</li>
          <li>201 — Created (POST)</li>
          <li>204 — No Content (DELETE)</li>
        </ul>
      </div>
      <div class="info-card">
        <h3>Errors</h3>
        <ul>
          <li>404 — Not Found</li>
          <li>422 — Validation Failed</li>
        </ul>
      </div>
    </div>
  </div>
</div>
<footer>Built by Naveen AutomationLabs &nbsp;|&nbsp; Free for QA students</footer>
</body>
</html>`);
});

// ─── GET /public/v2/users ─────────────────────────────────────────────────────
app.get("/public/v2/users", (req, res) => {
  let result = [...users];

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

module.exports = app;
