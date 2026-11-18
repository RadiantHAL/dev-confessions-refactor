# Dev Confessions API (Refactored)

An anonymous REST API for developers to share confessions regarding bugs, deadline stress, imposter syndrome, and vibe-coding sessions.

Originally written as a single-file monolithic codebase with cryptic variable names and tightly coupled responsibilities, this repository has been systematically refactored into a clean, maintainable Model-View-Controller (MVC) architecture following production engineering best practices.

---

## Live Deployment

- **Live Service URL:** [https://dev-confessions-api-radianthal.onrender.com](https://dev-confessions-api-radianthal.onrender.com)
- **Health Check Endpoint:** [https://dev-confessions-api-radianthal.onrender.com/health](https://dev-confessions-api-radianthal.onrender.com/health)
- **Confessions API Feed:** [https://dev-confessions-api-radianthal.onrender.com/api/v1/confessions](https://dev-confessions-api-radianthal.onrender.com/api/v1/confessions)

### Deployment Configuration (Render)
- **Environment:** Node.js
- **Root Directory:** `Milestone 01/challenge 1.11`
- **Build Command:** `npm install`
- **Start Command:** `npm start`
- **Environment Variables:**
  - `PORT`: Configured by Render runtime (default: 10000)
  - `DELETE_TOKEN`: `supersecret123`

---

## Refactoring Overview

The refactoring followed 8 structured moves without altering any of the original API contracts or response behaviors:

1. **Pre-Refactor Audit (`AUDIT.md`):** Complete catalog of design smells, anti-patterns, variable naming deficits, and hardcoded values before writing code.
2. **Variable Renaming:** Renamed all single-letter (`d`, `r`, `x`, `arr`, `i`, `cat`, `stuff`, `res2`) and misleading identifiers into self-documenting names.
3. **Function Splitting:** Dismantled the monolithic 90-line `handleAll()` dispatcher into discrete, single-responsibility functions.
4. **MVC Architecture:** Reorganized into decoupled layers (`routes/`, `controllers/`, `services/`).
5. **Centralized Environment Variables:** Moved hardcoded ports and authentication secrets to `.env` with a sanitized `.env.example`.
6. **Intent-Driven Inline Comments:** Documented *why* non-obvious logic and contract idiosyncrasies exist.
7. **Documentation (`CHANGES.md`):** Exhaustive record of every variable rename and function split.
8. **Automated Testing:** 18 comprehensive contract tests verifying 100% legacy API compatibility.

For detailed documentation, refer to:
- [`AUDIT.md`](./AUDIT.md) — Pre-refactoring audit log
- [`CHANGES.md`](./CHANGES.md) — Full variable rename table and function split rationale

---

## Project Structure

```text
Milestone 01/challenge 1.11/
├── .env                  # Local runtime environment variables
├── .env.example          # Template environment variable documentation
├── .gitignore            # Excludes node_modules and local environment secrets
├── AUDIT.md              # Move 1: Comprehensive pre-refactor code audit
├── CHANGES.md            # Move 7: Full changelog of renames & function splits
├── README.md             # Project documentation and deployment guide
├── app.js                # Application entrypoint & Express bootstrap
├── package.json          # Project manifest, scripts, and dependencies
├── vercel.json           # Serverless rewrite configuration
├── controllers/          # HTTP extraction, status code mapping, response serialization
│   └── confessionController.js
├── routes/               # URL endpoint declarations and middleware mapping
│   └── confessionRoutes.js
├── services/             # Business domain logic, validation rules, data store
│   └── confessionService.js
└── test/                 # Automated test suite (18 contract tests)
    └── api.test.js
```

---

## API Contract Specification

All endpoints are mounted under `/api/v1/confessions`.

### 1. `POST /api/v1/confessions`
Creates a new anonymous developer confession.
- **Request Body:** JSON `{ "text": string, "category": string }`
  - Allowed categories: `"bug"`, `"deadline"`, `"imposter"`, `"vibe-code"`
- **Success Response:** `201 Created`
  ```json
  {
    "id": 1,
    "text": "I push directly to main on Friday afternoons.",
    "category": "vibe-code",
    "created_at": "2026-11-18T10:00:00.000Z"
  }
  ```
- **Error Responses:**
  - Missing body &rarr; `400 Bad Request` `{ "msg": "bad" }`
  - Missing `text` &rarr; `400 Bad Request` `{ "msg": "need text" }`
  - Text length &ge; 500 characters &rarr; `400 Bad Request` `{ "error": "text too big, must be less than 500 characters long buddy" }`
  - Empty text length == 0 &rarr; `400 Bad Request` (text) `"too short"`
  - Invalid category &rarr; `400 Bad Request` (text) `"category not in stuff"`

### 2. `GET /api/v1/confessions`
Fetches all confessions sorted in reverse chronological order (newest first).
- **Success Response:** `200 OK`
  ```json
  {
    "data": [
      {
        "id": 2,
        "text": "Fixed a typo and broke production.",
        "category": "bug",
        "created_at": "2026-11-18T10:05:00.000Z"
      }
    ],
    "count": 1
  }
  ```

### 3. `GET /api/v1/confessions/:id`
Retrieves a single confession by its numeric ID.
- **Success Response:** `200 OK`
  ```json
  {
    "id": 1,
    "text": "I push directly to main on Friday afternoons.",
    "category": "vibe-code",
    "created_at": "2026-11-18T10:00:00.000Z"
  }
  ```
- **Error Responses:**
  - ID not found &rarr; `404 Not Found` `{ "msg": "not found" }`
  - Missing text property (data corruption check) &rarr; `500 Internal Server Error` `"broken"`

### 4. `GET /api/v1/confessions/category/:cat`
Retrieves all confessions belonging to a specific category, ordered newest first.
- **URL Parameter:** `cat` (`bug`, `deadline`, `imposter`, `vibe-code`)
- **Success Response:** `200 OK`
  ```json
  [
    {
      "id": 1,
      "text": "I push directly to main on Friday afternoons.",
      "category": "vibe-code",
      "created_at": "2026-11-18T10:00:00.000Z"
    }
  ]
  ```
- **Error Responses:**
  - Invalid category &rarr; `400 Bad Request` `{ "msg": "invalid category" }`

### 5. `DELETE /api/v1/confessions/:id`
Removes a confession by ID. Requires administrative security header.
- **Headers:** `x-delete-token: supersecret123` (or configured `DELETE_TOKEN`)
- **Success Response:** `200 OK`
  ```json
  {
    "msg": "ok",
    "item": {
      "id": 1,
      "text": "I push directly to main on Friday afternoons.",
      "category": "vibe-code",
      "created_at": "2026-11-18T10:00:00.000Z"
    }
  }
  ```
- **Error Responses:**
  - Missing or incorrect `x-delete-token` &rarr; `403 Forbidden` `{ "msg": "no permission" }`
  - Missing / non-numeric ID &rarr; `400 Bad Request` `"no id"`
  - Confession ID not found &rarr; `404 Not Found` `{ "msg": "not found buddy" }`

---

## Local Development & Testing

### 1. Installation
```bash
npm install
```

### 2. Configure Environment
```bash
cp .env.example .env
```
Default values:
```env
PORT=3000
DELETE_TOKEN=supersecret123
```

### 3. Run Server
```bash
npm start
```
Or with auto-restart on file change:
```bash
npm run dev
```

### 4. Execute Automated Contract Tests
```bash
npm test
```
Runs 18 end-to-end and unit contract checks testing every endpoint, status code, and validation path.
