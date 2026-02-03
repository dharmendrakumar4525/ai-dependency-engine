# Testing Guide – InsightBoard Backend

Server chalane ke baad ye steps follow karo. Sab commands terminal mein ya Postman/Swagger se run kar sakte ho.

---

## 1. Server start karo

```bash
cd /Users/dk/Project/arss/assignment
npm run start:dev
```

Success: log mein `Nest application successfully started` aana chahiye. Server **http://localhost:3000** par chal raha hoga.

---

## 2. Swagger UI se test (sabse aasaan)

1. Browser mein kholo: **http://localhost:3000/api**
2. **transcript** section:
   - **POST /transcript/process** – "Try it out" → Body mein daalo: `{ "transcript": "Action: Review docs.\nAction: Deploy code." }` → Execute
   - Response mein `transcriptId` aur `tasks` array aana chahiye
3. **jobs** section:
   - **POST /jobs** – "Try it out" → same body `{ "transcript": "Action: Task one." }` → Execute
   - Response: `jobId` aur `status` (pending ya completed)
   - **GET /jobs/{jobId}** – upar wale `jobId` paste karo → Execute
   - Pehli baar: `status: "pending"`. Thodi der baad dubara run karo: `status: "completed"` aur `tasks` aana chahiye

---

## 3. Terminal (curl) se test

**Server running hona chahiye (step 1).** Naya terminal kholo.

### Level 1 – Sync (POST /transcript/process)

```bash
curl -X POST http://localhost:3000/transcript/process \
  -H "Content-Type: application/json" \
  -d '{"transcript": "Action: Review meeting notes.\nAction: Send email."}'
```

**Expect:** JSON with `transcriptId` (UUID) aur `tasks` array. Har task mein `id`, `description`, `priority`, `dependencies`, `status` hona chahiye.

### Level 2 – Async job submit (POST /jobs)

```bash
curl -X POST http://localhost:3000/jobs \
  -H "Content-Type: application/json" \
  -d '{"transcript": "Action: Deploy to production."}'
```

**Expect:** `{"jobId":"...", "status":"pending"}` (ya pehle se same transcript ho to `"status":"completed"`).

### Level 2 – Job status (GET /jobs/:jobId)

Pehle wale response se `jobId` copy karo, phir:

```bash
curl http://localhost:3000/jobs/PASTE_JOB_ID_HERE
```

**Expect:**  
- Pehli baar: `{"jobId":"...", "status":"pending"}`  
- 5–10 sec baad dubara: `{"jobId":"...", "status":"completed", "transcriptId":"...", "tasks":[...]}`

---

## 4. Kya check karna hai (checklist)

| # | Test | Kaise | Pass kab |
|---|------|--------|----------|
| 1 | Server start | `npm run start:dev` | Koi error nahi, "successfully started" |
| 2 | Level 1 – transcript process | POST /transcript/process with body | 201, body mein transcriptId + tasks |
| 3 | Level 2 – job submit | POST /jobs with same body | 201, jobId + status |
| 4 | Level 2 – job status | GET /jobs/:jobId (pending) | 200, status: pending |
| 5 | Level 2 – job result | GET /jobs/:jobId (thodi der baad) | 200, status: completed, tasks array |
| 6 | Idempotency | Same transcript se dobara POST /jobs | Same jobId / completed wala job, duplicate process nahi |
| 7 | Swagger | Browser: localhost:3000/api | Docs khul rahe hon, Try it out se request chal rahi ho |
| 8 | Invalid body | POST with empty transcript `{"transcript":""}` | 400 validation error |

---

## 5. Optional – cycle / validation behaviour

- **Cycle:** Mock parser abhi simple chain banata hai (task-2 depends on task-1). Cycle wala case dekhne ke liye parser ko aise tasks dena padega jahan A→B→A ho; phir response mein affected tasks ka `status` "Blocked/Error" aana chahiye.
- **Bad dependency:** Parser agar koi aisa task de jiska dependency list mein koi ID exist nahi karti, to wo ID silently remove ho jati hai (crash nahi).

---

## Short summary

1. **Start:** `npm run start:dev`  
2. **Docs:** Browser → http://localhost:3000/api  
3. **Level 1:** POST /transcript/process → body `{"transcript": "some text"}`  
4. **Level 2:** POST /jobs → same body → mila jobId → GET /jobs/:jobId se status aur result check karo  

Agar koi step fail ho to error message batao, us hisaab se fix bata sakta hoon.
