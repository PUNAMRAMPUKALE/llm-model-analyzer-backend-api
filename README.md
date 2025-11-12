✅ FINAL BACKEND README (Node.js + Express + Prisma)
llm-model-analyzer-backend-api/README.md
### 🧪 LLM Model Analyzer – Backend API

This is the TypeScript + Express backend powering the LLM Lab system.
It orchestrates experiments, parameter sweeps, response collection, metrics computation, streaming progress, and exports.

###🌐 Purpose

The backend:

- Accepts experiments (prompt + LLM parameters).
- Generates parameter combinations.
- Produces mock or provider-backed LLM outputs.
- Sends responses to the Python ML Service for scoring.
- Stores Experiments → Runs → Responses → Metrics using PostgreSQL.
- Streams progress via SSE.
- Exposes APIs for frontend visualization + export.

### 🧱 Tech Stack
Component	Technology
Language	TypeScript
Server	Express
ORM	Prisma + PostgreSQL
Validation	Zod
Events	Internal EventBus
Metrics Engine	External FastAPI service
Deployment	Render / Railway / Docker
SSE	/runs/:id/stream

Works perfectly with the Next.js frontend.

### 📦 Installation
pnpm install
cp .env.example .env

### 🔧 Environment Variables

.env.example:

PORT=4000
NODE_ENV=development
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/llm_lab?schema=public
METRICS_SERVICE_URL=http://localhost:8080
LLM_PROVIDER=mock


### When deployed on Render:

DATABASE_URL=<render postgres url>
FRONTEND_ORIGIN=https://llm-model-analyzer-frontend.onrender.com

### 🗄 Database Setup

1. Local (Docker):
- docker compose up -d

2.Prisma Migrations:
- pnpm prisma generate
- pnpm prisma migrate dev --name init


# Render Deployment (no superuser perms):

Use:
- pnpm prisma migrate deploy
NOT migrate dev.

# ▶️ Start Server

1.Development:
- pnpm dev

2.Production:
- pnpm build
- pnpm start

3.Server runs at:
- http://localhost:4000


### 🧩 API Endpoints
Health
GET /health

Experiments
GET  /experiments
POST /experiments
GET  /experiments/:id

Runs (Execution)
POST /experiments/:id/run
GET  /runs/:runId
GET  /runs/:runId/stream   # SSE

Responses & Metrics
GET /experiments/:id/responses
GET /experiments/:id/metrics

Exports
GET /exports/:id.json
GET /exports/:id.csv


### 🧬 Database Schema

Tables:
- Experiment
- Run
- Response
- Metric

Includes indexes to optimize:
- experiment listing
- response ordering
- metric queries
- quality ranking

### 🔌 ML Metrics Service

Backend sends each response to:

POST /metrics
POST /metrics/batch

### 📡 SSE Streaming
GET /runs/:id/stream

Events: progress, completed, failed used by the frontend to update experiment execution in real-time.


### 📦 Exports

The backend supports:

Per-experiment:
GET /exports/:id.csv
GET /exports/:id.json


### 🚀 Deployment (Render)

Create a Web Service.

Set environment variables:

DATABASE_URL=...
FRONTEND_ORIGIN=https://your-frontend.onrender.com


Use build command:

pnpm install --prod=false
pnpm prisma generate
pnpm prisma migrate deploy
pnpm build


Start command:
pnpm start


Ensure the CORS middleware includes:
origin: FRONTEND_ORIGIN

### 🧾 License

MIT License.

### ✨ Credits

Developed with a modular architecture optimized for clarity, reliability, and LLM experiment analysis.