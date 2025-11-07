# LLM Model Analyzer – Backend API

This repository contains the **Backend API** for the *LLM Response Quality Analyzer* challenge.
It is a modular, event-driven TypeScript + Express backend that manages experiment orchestration, connects to a FastAPI-based ML metrics service, and persists results using Prisma + PostgreSQL. The goal is to analyze how different LLM parameters (like temperature and top_p) affect response quality, compute metrics programmatically, and expose the data through clean APIs.

---

### Overview

This backend acts as the **controller** of the entire system:

1. Accepts experiment definitions (prompt + parameter ranges).
2. Expands parameter combinations and generates mock (or real) LLM responses.
3. Sends each response to the **ML service** for scoring and quality evaluation.
4. Stores Experiments, Runs, Responses, and Metrics in the PostgreSQL database.
5. Streams progress via Server-Sent Events (SSE) and allows exports in JSON/CSV.

---

### Tech Stack

* **Language**: TypeScript (Node.js 20+)
* **Framework**: Express.js with async error handling
* **ORM**: Prisma 5.x + PostgreSQL
* **Validation**: Zod schema validation
* **Events**: Domain EventBus for internal communication
* **Logging**: Morgan
* **Config**: dotenv for environment management
* **Deployment**: Docker + CI/CD (GitHub Actions)
* **Metrics Provider**: External FastAPI ML service on port `9090`

---

### Installation & Setup

#### 1. Clone and install

```bash
git clone https://github.com/<your-user>/llm-model-analyzer-backend-api.git
cd llm-model-analyzer-backend-api
pnpm install
```

#### 2. Environment setup

```bash
cp .env.example .env
```

Update values as needed:

```
PORT=4000
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/llm_lab?schema=public"
METRICS_SERVICE_URL="http://localhost:9090"
LLM_PROVIDER="mock"
```

#### 3. Start database

```bash
docker compose up -d
```

#### 4. Run Prisma migrations

```bash
pnpm prisma:generate
pnpm prisma:migrate
```

#### 5. Start the backend

```bash
pnpm dev
# → [backend] listening on http://localhost:4000
```

---

### API Endpoints

#### Health

```
GET /health
→ { "status": "ok", "env": "development" }
```

#### Create Experiment

```
POST /experiments
{
  "title": "Temp Sweep",
  "prompt": "Explain temperature and top_p in 3 bullets.",
  "model": "mock-model",
  "gridSpec": { "temperature": [0.0, 0.5, 0.9], "top_p": [0.7, 0.9], "samples": 2 }
}
→ 201 { "id": "...", "title": "...", ... }
```

#### Run Experiment

```
POST /runs/:experimentId/run
→ 202 { "runId": "...", "status": "RUNNING" }
```

#### Stream Progress

```
GET /runs/:runId/stream
(events: progress | completed | failed)
```

#### Get Run Results

```
GET /runs/:runId
→ includes responses and computed metrics
```

#### Export Data

```
GET /exports/:experimentId.json
GET /exports/:experimentId.csv
```

---

### Data Model

| Table          | Description                                        |
| -------------- | -------------------------------------------------- |
| **Experiment** | Stores prompt, model, and gridSpec                 |
| **Run**        | Tracks the execution and status of each experiment |
| **Response**   | Individual LLM outputs with latency and tokens     |
| **Metric**     | Quality scores returned by the ML service          |

---

### Integration with ML Service

* The ML service runs separately (`uvicorn app:app --port 9090`) and provides `/metrics` and `/metrics/batch` endpoints.
* The backend calls this service after generating each LLM response.
* Returned metrics (coherence, coverage, redundancy, etc.) are stored with each response.

Example response from ML service:

```json
{
  "scores": {"COH": 0.82, "COV": 0.76, "RED": 0.15},
  "details": {"length": 152, "readability": "grade 8.1"},
  "overall_quality": 0.78
}
```

---

### Testing the Flow

1. **Start all services**

   * PostgreSQL via Docker
   * ML Service (FastAPI) on port `9090`
   * Backend on port `4000`

2. **Create and run an experiment**

   ```bash
   EXP=$(curl -s -X POST http://localhost:4000/experiments \
     -H "Content-Type: application/json" \
     -d '{"title":"Test","prompt":"Explain top_p","model":"mock","gridSpec":{"temperature":[0.3,0.6],"top_p":[0.8,0.9],"samples":1}}')
   EXPID=$(echo "$EXP" | jq -r .id)
   curl -X POST http://localhost:4000/runs/$EXPID/run
   ```

3. **Watch progress in Prisma Studio**

   ```bash
   pnpm db:studio
   ```

---

### CI/CD & Deployment

* **CI/CD** uses GitHub Actions.
* In pipelines, only migration and build steps run:

  ```bash
  pnpm prisma:generate
  pnpm db:migrate:deploy
  pnpm build
  pnpm start
  ```
* Prisma Studio (`pnpm db:studio`) is restricted to local development.

---

### Folder Structure

```
src/
 ├─ domain/
 │   ├─ models.ts
 │   ├─ events/
 ├─ infra/
 │   ├─ prisma.ts
 ├─ services/
 │   ├─ runs/
 │   ├─ metrics/
 ├─ config/
 │   ├─ env.ts
 └─ server.ts
prisma/
 ├─ schema.prisma
 ├─ migrations/
scripts/
 └─ dev-only.js
```

---

### Development Notes

* Event-driven design using an internal `EventBus` ensures async handling of run states.
* Robust error handling and clean logging for all routes.
* `expandGrid()` logic systematically builds parameter combinations for experiments.
* Metrics requests are isolated in `MetricsClient` for reusability.

---

### Exports & Comparison

* `GET /exports/:id.csv` → download experiment data.
* Load CSV into Excel, Google Sheets, or visualization dashboards to compare parameter effects on quality.

---

### Metrics Philosophy

* No “LLM as a judge”.
* Uses quantitative analysis (coherence, coverage, redundancy, etc.) via NLP heuristics.
* Consistent, explainable scores for reproducible evaluation.

---

### Deployment Targets

* **Backend**: Render / Railway / Fly.io
* **Database**: Managed Postgres (Supabase / Neon)
* **ML Service**: Python FastAPI on Render or EC2
* **Frontend** (later): Next.js app connecting via REST APIs

---

### Time & Deliverables

* **Live Backend URL**
* **Live ML Service**
* **GitHub Source Code**
* **Demo Video (5–10 min)**
  Walkthrough: setup, create experiment, run, inspect metrics, export results.
* **Time Estimate Sheet** (as per challenge template)

---

### License

MIT © 2025 [Your Name]

---

### Summary

This backend completes all challenge requirements:

* Functional API + persistence
* Modular, event-driven design
* Custom ML-based metrics
* Export + comparison tools
* Polished documentation and CI/CD readiness
