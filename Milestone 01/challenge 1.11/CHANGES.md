# CHANGES.md — Dev Confessions Refactoring Log

This document provides a complete, evidence-based log of every refactoring decision made while modernizing the Dev Confessions Express API codebase. The refactoring transforms a monolithic, single-file codebase with cryptic naming into a modular, production-ready MVC architecture while strictly preserving 100% of the original API contract and behavioral edge cases.

---

## Section 1: Variable Renames

The original codebase relied heavily on single-letter variables, confusing abbreviations, misleading names (e.g., `res2` alongside `res`), and generic nouns (`stuff`, `info`). Below is the comprehensive mapping of every renamed variable across the project.

| Old Name | New Name | Why |
|---|---|---|
| `d` | `confessionData` | `d` gave no information about what the variable held; `confessionData` clearly indicates the payload object containing user submission data (`text`, `category`). |
| `r` | `req.params` / `confessionId`, `categoryName` | `r` was cryptic and easily confused with `req` or `res`. Extracting named parameters directly (`confessionId`, `categoryName`) makes route param handling explicit. |
| `t` | *(Eliminated in favor of discrete route handlers)* | `t` was a single-letter string flag (`'create'`, `'getAll'`, `'getOne'`, `'getCat'`, `'del'`) used to drive an anti-pattern monolithic `switch/if-else` dispatcher. Replaced by dedicated controller methods. |
| `x` | `lastConfessionId` | Single-letter `x` hid its actual role as an auto-incrementing integer sequence counter for generating unique primary keys. |
| `tmp` | `newConfession` | `tmp` falsely implied the record was temporary or ephemeral, when in fact it was the newly constructed confession entity persisted into permanent in-memory storage. |
| `categories` / `cats` | `VALID_CATEGORIES` | Both names were used inconsistently in different branches of `handleAll`. Centralized into uppercase `VALID_CATEGORIES` constant at the service layer, signaling an immutable whitelist. |
| `arr` | `sortedConfessions` | `arr` described only the low-level data structure (array) rather than its contents or ordering semantics; `sortedConfessions` indicates both entity type and chronological sort order. |
| `result` | `confessionFeed` | `result` is a vague generic term; `confessionFeed` describes the formatted collection object exposing `{ data, count }`. |
| `i` | `confessionId` | Single-letter `i` is conventionally used for loop counters; here it held the parsed integer primary key used for database lookups and deletions. |
| `info` | `matchedConfession` | `info` is completely ambiguous; `matchedConfession` specifies the single domain record retrieved from the data store. |
| `fn` | `item` / `confession` | `fn` conventionally denotes a function or callback; using it as the iterator parameter inside `confessions.find(fn => ...)` was misleading. |
| `cat` | `categoryName` / `categoryParam` | Abbreviated `cat` looks like the animal noun or unix command; `categoryName` denotes the URL slug representing the topic filter. |
| `stuff` | `categoryConfessions` | `stuff` is uninformative and unprofessional; `categoryConfessions` describes the filtered array of confession entities belonging to the requested category. |
| `x` (in filter callback) | `confession` | Single letter `x` masked the domain model being evaluated in the filter predicate. |
| `handler` | `targetIndex` | `handler` conventionally describes an event listener or middleware function; here it was an integer array index returned from `findIndex()`. |
| `res2` | `deletedItems` | `res2` was dangerously similar to the HTTP response object `res`, inviting severe variable shadowing bugs. `deletedItems` explicitly describes the spliced record array. |
| `startStr` | `startupMessage` | `startStr` used awkward hungarian-style abbreviation; `startupMessage` is descriptive and clear. |
| `'supersecret123'` (hardcoded) | `expectedDeleteToken` / `process.env.DELETE_TOKEN` | Hardcoded credential in source code replaced with environment variable read dynamically with fallback. |
| `3000` (hardcoded) | `serverPort` / `process.env.PORT` | Hardcoded network port replaced with configurable environment variable. |

---

## Section 2: Function Splits

### `handleAll()` Split

The original `handleAll(req, res, t)` was a monolithic 90-line function that violated the Single Responsibility Principle by combining:
1. HTTP route dispatching via a string parameter `t`.
2. Input extraction and validation logic.
3. In-memory data store mutations and queries.
4. Authorization checks for administrative routes.
5. Inconsistent error mapping and HTTP response serialization.

It was completely eliminated and refactored into the following focused, single-responsibility functions across the MVC layers:

#### A. Service Layer (`services/confessionService.js`)
Contains all business logic, data persistence, and domain validation. Completely decoupled from Express HTTP objects (`req`, `res`).

- **`validateConfessionPayload(confessionData)`**
  - **Single Responsibility:** Validates confession submission data against domain rules (presence of payload, presence of text, length < 500 characters, length > 0, and allowed category whitelist).
  - **Why:** Separates validation logic from HTTP request handling, making rules unit-testable without spinning up an HTTP server.

- **`createConfessionRecord(confessionData)`**
  - **Single Responsibility:** Constructs a new confession record with auto-incremented ID and timestamp, then appends it to the in-memory collection.
  - **Why:** Isolates database write operations and ensures consistent entity construction.

- **`fetchAllConfessions()`**
  - **Single Responsibility:** Clones and sorts the confession records in reverse chronological order (`created_at` descending, with ID tie-breaking) and returns the formatted `{ data, count }` structure.
  - **Why:** Encapsulates collection retrieval and prevents accidental in-place mutation of the primary data store.

- **`findConfessionById(confessionId)`**
  - **Single Responsibility:** Queries the in-memory array for a confession matching the provided ID.
  - **Why:** Single-purpose read operation by primary key.

- **`isCategoryValid(categoryName)`**
  - **Single Responsibility:** Verifies whether a given category string exists in the allowed categories whitelist.
  - **Why:** Reusable predicate used by both input validation and category query filtering.

- **`fetchConfessionsByCategory(categoryName)`**
  - **Single Responsibility:** Filters confessions by category and reverses the array to present newest items first.
  - **Why:** Encapsulates the specific category query logic and ordering contract.

- **`removeConfessionById(confessionId, clientToken, expectedToken)`**
  - **Single Responsibility:** Authorizes the deletion token, checks for record existence, and removes the record from storage.
  - **Why:** Centralizes deletion authorization and state mutation in the domain layer.

---

#### B. Controller Layer (`controllers/confessionController.js`)
Extracts HTTP parameters from `req`, calls service layer methods, and maps results to HTTP responses. Contains zero business logic and zero direct database calls.

- **`createConfession(req, res)`**
  - **Single Responsibility:** Extracts `req.body`, invokes `validateConfessionPayload`, handles validation errors with exact contract matching (e.g. 400 JSON vs 400 plain text), calls `createConfessionRecord`, and returns HTTP 201.
  - **Why:** Decouples HTTP protocol concerns from confession creation rules.

- **`getAllConfessions(req, res)`**
  - **Single Responsibility:** Calls `confessionService.fetchAllConfessions()` and sends the resulting JSON feed.
  - **Why:** Provides a dedicated HTTP handler for the collection endpoint.

- **`getConfessionById(req, res)`**
  - **Single Responsibility:** Parses `req.params.id`, retrieves the record via `findConfessionById`, checks the legacy data integrity condition (sending 500 `"broken"` if text is missing), and returns the record or 404.
  - **Why:** Encapsulates HTTP response mapping for single item lookups.

- **`getConfessionsByCategory(req, res)`**
  - **Single Responsibility:** Extracts `req.params.cat`, checks category validity, retrieves filtered records, and returns HTTP 200 JSON or HTTP 400 error.
  - **Why:** Dedicated controller action for category-filtered routes.

- **`deleteConfession(req, res)`**
  - **Single Responsibility:** Extracts route parameter `id`, deletion header `x-delete-token`, and expected token from `process.env.DELETE_TOKEN`, delegates deletion to `removeConfessionById`, and serializes 200, 400, 403, or 404 responses.
  - **Why:** Isolates header parsing and HTTP status code mapping from storage operations.

---

#### C. Route Layer (`routes/confessionRoutes.js`)
Pure routing definitions using `express.Router()`.

- **`GET /category/:cat`** &rarr; `confessionController.getConfessionsByCategory`
- **`POST /`** &rarr; `confessionController.createConfession`
- **`GET /`** &rarr; `confessionController.getAllConfessions`
- **`GET /:id`** &rarr; `confessionController.getConfessionById`
- **`DELETE /:id`** &rarr; `confessionController.deleteConfession`

**Why:** Completely removes inline routing callbacks and business logic from route definitions, adhering to standard Express RESTful routing practices.

---

## Architectural Summary of Refactored Structure

```
challenge 1.11/
├── .env                  # Local runtime environment variables (PORT, DELETE_TOKEN)
├── .env.example          # Sanitized template documentation for required environment keys
├── .gitignore            # Excludes node_modules and local .env files
├── AUDIT.md              # Move 1: Pre-refactoring audit of codebase smells
├── CHANGES.md            # Move 7: Comprehensive changelog of renames and function splits
├── README.md             # Project documentation, API contract specs, and live deployment link
├── app.js                # Move 5: Express entrypoint bootstrap with dotenv and route mounting
├── controllers/          # Move 4: HTTP request extraction and response formatting
│   └── confessionController.js
├── routes/               # Move 4: URL endpoint mapping to controllers
│   └── confessionRoutes.js
├── services/             # Move 4: Business logic, validation, and storage persistence
│   └── confessionService.js
└── test/                 # Automated contract test suite (18/18 passing)
    └── api.test.js
```
