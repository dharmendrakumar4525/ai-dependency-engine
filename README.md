# InsightBoard – Dependency Engine

Backend service that converts a meeting transcript into a structured task dependency graph. Implements **Level 1** (robust backend) and **Level 2** (async processing + idempotency).

## Levels Completed

- **Level 1**: Strict schema, dependency validation, cycle detection, persistence.
- **Level 2**: Async job submission (jobId + status polling), idempotent submission (same transcript returns existing result).

## Tech Stack

- Node.js, NestJS (TypeScript)
- TypeORM
- SQLite (default, local); PostgreSQL via env
- Validation: class-validator / class-transformer
- LLM: OpenAI (optional) – when `OPENAI_API_KEY` is set, transcript → tasks via API; else mock parser

## Setup

```bash
npm install
cp .env.example .env   # if .env is missing
npm run start:dev
```

A **.env** file (same as .env.example) is used for config. Defaults: SQLite, port 3000; no LLM key → mock parser. Set `OPENAI_API_KEY` in .env to use the LLM parser.

Server runs at `http://localhost:3000` (or `PORT` from env). API docs: **http://localhost:3000/api** (Swagger UI).

### LLM (OpenAI)

To use the LLM parser instead of the mock, set in `.env`:

```
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini
```

If `OPENAI_API_KEY` is not set, the app uses a **mock parser**: it splits the transcript by lines and turns each line into a task (with linear dependencies). Output will look like "task-1 = first line, task-2 = second line…". For **actionable tasks** (e.g. "Fix Stripe payment bug", "Stable build by Monday") with real dependencies, set `OPENAI_API_KEY` in `.env` and restart; the LLM parser will then extract proper tasks from the meeting.

### Database migration (Task primary key fix)

If you have an existing database with the old `tasks` schema, run before starting the app:

```bash
npm run migration:run
```

This migrates `tasks` from `id` (string PK) to UUID primary key + `taskId` (logical ID), preventing cross-transcript collisions. Fresh installs use the new schema directly via synchronize.

### PostgreSQL

Set in `.env`:

```
DB_TYPE=postgres
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=...
DB_NAME=insightboard
```

## API

### Sending the transcript

1. **File upload (recommended)**  
   `Content-Type: multipart/form-data`, field name **`transcript`** – upload a `.txt` file with the meeting transcript. No escaping, no JSON, no size/control-char issues. Max 10MB file.

2. **Raw text**  
   `Content-Type: text/plain` – send the transcript as the request body. Max 10MB.

3. **JSON with base64**  
   `{ "transcriptBase64": "base64-encoded-string" }` – encode the transcript in base64 and put it in this field. Good for very long or binary-safe payloads.

4. **JSON with transcript**  
   `{ "transcript": "plain text" }` – for short text; long text with newlines can hit JSON control-character errors. Prefer (1) or (2) for long transcripts.

### Level 1 – Sync processing

- **POST /transcript/process**  
  Body: file (form-data field `transcript`), raw text (text/plain), or JSON `{ "transcript": "..." }` / `{ "transcriptBase64": "..." }`  
  Response: `{ "transcriptId": "uuid", "tasks": [ { "id", "description", "priority", "dependencies", "status" }, ... ] }`

### Level 2 – Async + idempotency

- **POST /jobs**  
  Body: same as above (file, raw text, or JSON)  
  Response: `{ "jobId": "uuid", "status": "pending" | "completed" }`  
  Same transcript hash → returns existing job (`status: "completed"`) without reprocessing.

- **GET /jobs/:jobId**  
  Response: `{ "jobId", "status", "transcriptId?", "tasks?" }`  
  When `status === "completed"`, includes `transcriptId` and `tasks`.

### Curl examples

| Action | Curl |
|--------|------|
| Process (file) | `curl -X POST http://localhost:3000/transcript/process -F "transcript=@meeting.txt"` |
| Process (raw) | `curl -X POST http://localhost:3000/transcript/process -H "Content-Type: text/plain" -d @meeting.txt` |
| Process (JSON) | `curl -X POST http://localhost:3000/transcript/process -H "Content-Type: application/json" -d '{"transcript": "Meeting notes."}'` |
| Submit job (file) | `curl -X POST http://localhost:3000/jobs -F "transcript=@meeting.txt"` |
| Get job status | `curl http://localhost:3000/jobs/JOB_ID` |

Full curl examples: see **CURL.md**.

## Cycle detection

DFS with a recursion stack: when a node is re-entered while still in the stack, it belongs to a cycle. All nodes in cycles are marked `status: "Blocked/Error"`; others stay `"Ready"`. Invalid dependency IDs (not in the task set) are removed before cycle detection.

## Idempotency (Level 2)

Transcript text is hashed (SHA-256). Before creating a new job, the backend looks for a completed job with the same hash. If found, it returns that job’s id and status; no duplicate processing.

## Project layout

- `src/config` – DB config (SQLite / PostgreSQL).
- `src/persistence/entities` – Transcript, Task, Job.
- `src/graph` – Dependency sanitization and DFS cycle detection.
- `src/transcript` – Parser interface, mock parser, orchestration, Level 1 endpoint.
- `src/jobs` – Level 2 endpoints (submit job, get status).

## Requirements coverage

| Requirement | Status |
|-------------|--------|
| Input: plain-text transcript via HTTP | POST /transcript/process, POST /jobs; DTO validation |
| Task: id (task-1, …), description, priority (H/M/L), dependencies | Types, entity, DTOs; mock parser emits task-N |
| Validation: deps only existing IDs; remove invalid silently; no crash | GraphService.sanitizeDependencies |
| Cycle detection: deterministic (DFS); no throw; mark Blocked/Error | GraphService.detectCyclesAndSetStatus |
| Persistence: transcript + task graph; TypeORM | Transcript, Task entities; repositories |
| Thin controllers; logic in services; graph logic isolated | Controllers delegate; GraphModule isolated |
| SQLite local; switch to PostgreSQL | DB_TYPE=postgres + env vars |
