# NAL Mock API 🚀

A free mock REST API for QA & SDET students — identical structure to GoRest.  
Built by **Naveen AutomationLabs**.

---

## ⚡ Deploy to Railway (Recommended — 2 minutes)

Railway runs your app as a **single persistent Node.js process**, so in-memory data is shared across all requests and all students hit the same server instance.

1. Push this folder to a GitHub repo
2. Go to [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub repo**
3. Select your repo → Railway auto-detects Node.js and deploys
4. Your API is live at: `https://your-project.up.railway.app`

> ⚠️ Data resets on redeploy. This is useful — redeploy anytime to get a clean slate for a new batch.

---

## 🔧 Run Locally

```bash
npm install
node server.js
```

API runs at `http://localhost:3000`  
Docs homepage at `http://localhost:3000/`

---

## 🔐 Authentication

- **GET** requests are **public** — no token needed
- **POST, PUT, PATCH, DELETE** require an `Authorization` header with a Bearer token

```
Authorization: Bearer <your-token>
```

Any non-empty token is accepted. Use anything — `demo-token`, `abc123`, `naveen-rocks`.  
Only `blocked-token` is rejected (triggers 403, useful for testing forbidden scenarios).

---

## 📋 Endpoints

| Method | Endpoint | Auth Required | Description |
|--------|----------|:---:|-------------|
| GET | `/public/v2/users` | ❌ | List all users (paginated) |
| POST | `/public/v2/users` | ✅ | Create a new user |
| GET | `/public/v2/users/:id` | ❌ | Get user by ID |
| PUT | `/public/v2/users/:id` | ✅ | Replace user (full update) |
| PATCH | `/public/v2/users/:id` | ✅ | Update user (partial) |
| DELETE | `/public/v2/users/:id` | ✅ | Delete user |

---

## 📦 User Schema

```json
{
  "id": 1001,
  "name": "Aarav Sharma",
  "email": "aarav.sharma@example.com",
  "gender": "male",
  "status": "active"
}
```

| Field | Type | Values |
|-------|------|--------|
| `id` | integer | Auto-generated |
| `name` | string | Required |
| `email` | string | Required, must be unique |
| `gender` | string | `"male"` or `"female"` |
| `status` | string | `"active"` or `"inactive"` |

---

## 🧪 Example Requests (curl)

### GET all users — no token needed
```bash
curl http://localhost:3000/public/v2/users
```

### GET with filters and pagination
```bash
curl "http://localhost:3000/public/v2/users?status=active&gender=male&page=1&per_page=5"
```

### GET single user — no token needed
```bash
curl http://localhost:3000/public/v2/users/1001
```

### POST — Create user (token required)
```bash
curl -X POST http://localhost:3000/public/v2/users \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer demo-token" \
  -d '{"name":"Naveen Kumar","email":"naveen@example.com","gender":"male","status":"active"}'
```

### PUT — Full update (token required)
```bash
curl -X PUT http://localhost:3000/public/v2/users/1001 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer demo-token" \
  -d '{"name":"Naveen Kumar","email":"naveen@example.com","gender":"male","status":"inactive"}'
```

### PATCH — Partial update (token required)
```bash
curl -X PATCH http://localhost:3000/public/v2/users/1001 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer demo-token" \
  -d '{"status":"inactive"}'
```

### DELETE user (token required)
```bash
curl -X DELETE http://localhost:3000/public/v2/users/1001 \
  -H "Authorization: Bearer demo-token"
```

---

## 🔍 Query Parameters

| Parameter | Description | Example |
|-----------|-------------|---------|
| `name` | Filter by name (partial match) | `?name=aarav` |
| `email` | Filter by email (partial match) | `?email=example.com` |
| `gender` | Filter by gender | `?gender=male` |
| `status` | Filter by status | `?status=active` |
| `page` | Page number | `?page=2` |
| `per_page` | Results per page (max 100) | `?per_page=5` |

---

## 📄 Response Headers

### Pagination Headers

| Header | Description |
|--------|-------------|
| `X-Pagination-Total` | Total number of records |
| `X-Pagination-Pages` | Total number of pages |
| `X-Pagination-Page` | Current page number |
| `X-Pagination-Limit` | Results per page |

### Rate Limit Headers

| Header | Description |
|--------|-------------|
| `X-RateLimit-Limit` | Max requests per minute (60) |
| `X-RateLimit-Remaining` | Remaining requests in current window |
| `X-RateLimit-Reset` | Seconds until limit resets |

---

## 🚦 HTTP Status Codes

| Code | Meaning | How to trigger |
|------|---------|----------------|
| `200` | OK | Any successful GET, PUT, PATCH |
| `201` | Created | Successful POST |
| `204` | No Content | Successful DELETE |
| `304` | Not Modified | GET with `If-None-Match` matching current ETag |
| `400` | Bad Request | Send malformed/invalid JSON body |
| `401` | Unauthorized | POST/PUT/PATCH/DELETE without `Authorization` header |
| `403` | Forbidden | Send `Authorization: Bearer blocked-token` |
| `404` | Not Found | Request a non-existent user ID |
| `405` | Method Not Allowed | e.g. `DELETE /public/v2/users` (missing ID) |
| `415` | Unsupported Media Type | POST without `Content-Type: application/json` |
| `422` | Validation Failed | POST with blank/invalid fields |
| `429` | Too Many Requests | Exceed 60 requests per minute |
| `500` | Internal Server Error | Unexpected server-side error |

---

## 🌱 Seed Data

The API comes pre-loaded with **20 users** (IDs 1001–1020). New users created via POST start from ID 1021. All data resets when the server restarts.

---

## ⚠️ Notes

- All write operations (`POST`, `PUT`, `PATCH`, `DELETE`) require `Content-Type: application/json` and a Bearer token
- Duplicate emails return a `422` validation error
- Rate limit is **60 requests/minute per IP**
- Use `blocked-token` to deliberately trigger a `403` response in tests

---

*Made with ❤️ for the QA community — Naveen AutomationLabs*
