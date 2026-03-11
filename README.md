# NAL Mock API 🚀

A free mock REST API for QA & SDET students — identical structure to GoRest.  
Built by **Naveen AutomationLabs**.

---

## ⚡ Deploy to Vercel (2 minutes)

1. Push this folder to a GitHub repo
2. Go to [vercel.com](https://vercel.com) → **New Project** → Import your repo
3. Click **Deploy** — done!

Your API will be live at: `https://your-project-name.vercel.app`

---

## 🔧 Run Locally

```bash
npm install
node server.js
```

API runs at `http://localhost:3000`

---

## 📋 Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/public/v2/users` | List all users |
| POST | `/public/v2/users` | Create a user |
| GET | `/public/v2/users/:id` | Get user by ID |
| PUT | `/public/v2/users/:id` | Replace user |
| PATCH | `/public/v2/users/:id` | Partial update |
| DELETE | `/public/v2/users/:id` | Delete user |

---

## 🧪 Example Requests

### GET all users
```bash
curl https://your-api.vercel.app/public/v2/users
```

### GET with filters
```bash
curl "https://your-api.vercel.app/public/v2/users?status=active&page=1&per_page=5"
```

### POST — Create user
```bash
curl -X POST https://your-api.vercel.app/public/v2/users \
  -H "Content-Type: application/json" \
  -d '{"name":"Naveen Kumar","email":"naveen@example.com","gender":"male","status":"active"}'
```

### PATCH — Update user
```bash
curl -X PATCH https://your-api.vercel.app/public/v2/users/1001 \
  -H "Content-Type: application/json" \
  -d '{"status":"inactive"}'
```

### DELETE user
```bash
curl -X DELETE https://your-api.vercel.app/public/v2/users/1001
```

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

**gender**: `"male"` | `"female"`  
**status**: `"active"` | `"inactive"`

---

## 📄 Response Headers (Pagination)

| Header | Description |
|--------|-------------|
| `X-Pagination-Total` | Total number of records |
| `X-Pagination-Pages` | Total pages |
| `X-Pagination-Page` | Current page |
| `X-Pagination-Limit` | Items per page |

---

## ⚠️ Notes

- Data resets on each cold start (Vercel serverless). This is by design for practice.
- No auth required — fully open API.
- Duplicate emails return 422 validation error.
- Pre-seeded with 20 Indian names for realism.

---

*Made with ❤️ for the QA community — Naveen AutomationLabs*
