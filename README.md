# AI Dependency Engine

Meeting transcript → task dependency graph. Extracts tasks with an LLM, validates dependencies, detects cycles, persists everything.

**Live:** https://ai-dependency-engine-production.up.railway.app  
**Swagger:** https://ai-dependency-engine-production.up.railway.app/api

## Levels

| Level | Features |
|-------|----------|
| **1** | Sync processing, dependency sanitization, cycle detection, SQLite/Postgres persistence |
| **2** | Async jobs (jobId + polling), idempotent submission (same transcript = same result) |

## Stack

- NestJS, TypeScript, TypeORM
- SQLite (default) / PostgreSQL
- OpenAI (optional, mock parser when key absent)
- Zod for LLM output validation
- Docker-ready

## Quick start

**Local**

```bash
npm install
cp .env.example .env
npm run start:dev
```

**Docker**

```bash
docker compose up --build
```

Server: `http://localhost:3000`  

## API

| Method | Path | Body | Response |
|--------|------|------|----------|
| POST | `/transcript/process` | file / raw text / JSON | `{ transcriptId, tasks[] }` |
| POST | `/jobs` | same | `{ jobId, status }` |
| GET | `/jobs/:jobId` | — | `{ jobId, status, transcriptId?, tasks?, errorMessage? }` |

**Transcript input**

- File: `multipart/form-data`, field `transcript` (.txt) — best for long transcripts
- Raw: `Content-Type: text/plain`
- JSON: `{ "transcript": "..." }` or `{ "transcriptBase64": "..." }`

**File upload flow (recommended)**

1. Client sends POST with `Content-Type: multipart/form-data`
2. Form field name must be `transcript`, value = .txt file
3. Server reads file into memory (max 10MB), decodes as UTF-8
4. Transcript → parser (mock or LLM) → tasks
5. Graph logic: sanitize deps, detect cycles
6. Save transcript + tasks to DB
7. Response: `{ transcriptId, tasks[] }` (201)

**Examples**

```bash
# Local
curl -X POST http://localhost:3000/transcript/process -H "Content-Type: application/json" -d '{"transcript": "Fix the bug. Deploy by Monday."}'

# Live (file upload)
curl -X POST https://ai-dependency-engine-production.up.railway.app/transcript/process -F "transcript=@meeting.txt"
```

**Postman / API client:** Body → form-data → key `transcript`, type File → select .txt

## Config (.env)

| Var | Default | Description |
|-----|---------|-------------|
| PORT | 3000 | Server port |
| DB_TYPE | sqlite | `sqlite` or `postgres` |
| DB_PATH | ./data/insightboard.sqlite | SQLite path |
| OPENAI_API_KEY | — | If set, uses LLM parser; else mock |
| OPENAI_MODEL | gpt-4o-mini | Model for LLM |
| LLM_TIMEOUT_MS | 60000 | LLM request timeout |

PostgreSQL: set `DB_TYPE=postgres`, `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`.

## Logic

**Dependency sanitization**  
Removes dependency IDs that don’t exist in the task list. No crash.

**Cycle detection**  
DFS with recursion stack. Tasks in cycles get `status: "Blocked/Error"`; others stay `"Ready"`.

**Idempotency**  
Transcript SHA-256 hash. Same hash → returns existing completed job.

**Duplicate task IDs**  
LLM can return duplicate IDs. Normalization auto-suffixes: `task-1`, `task-1-2`, etc.

## Project layout

```
src/
├── config/           # DB config, data-source for migrations
├── graph/            # sanitizeDependencies, detectCyclesAndSetStatus
├── jobs/             # POST /jobs, GET /jobs/:id
├── persistence/      # Transcript, Task, Job entities
├── transcript/       # Parser (mock/LLM), process endpoint
└── migrations/       # Task PK fix, Job error fields
```

## Scripts

```bash
npm run start:dev      # Dev with watch
npm run start:prod     # Production
npm run build          # Build
npm test               # Unit tests
npm run test:e2e       # E2E
npm run migration:run  # Run migrations
```

## Migration

Existing DBs with old `tasks` schema (string PK): run `npm run migration:run` before start. Fresh installs use synchronize.
