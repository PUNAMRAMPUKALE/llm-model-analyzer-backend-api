✅ FINAL BACKEND README (Node.js + Express + Prisma)
llm-model-analyzer-backend-api/README.md
### 🧪 LLM Model Analyzer – Backend API

This is the TypeScript + Express backend powering the LLM Lab system.
It orchestrates experiments, parameter sweeps, response collection, metrics computation, streaming progress, and data exports.
### 🌐 Purpose (UPDATED)

The backend:
Accepts experiments (prompt + LLM grid parameters).
Generates parameter combinations.
Produces LLM responses using Groq (via GROQ_API_KEY).
Computes metrics locally using the internal MetricsClient (no Python service required).
Stores Experiments → Runs → Responses → Metrics in PostgreSQL via Prisma.
Streams progress via SSE for real-time UI updates.
Provides JSON/CSV export APIs for the frontend.

### 🧱 Tech Stack
Component	Technology
Language	TypeScript
Server	Express.js
ORM	Prisma + PostgreSQL
Validation	Zod
Events	Internal EventBus
Metrics Engine	Local Node.js MetricsClient
LLM Provider	Groq API (via GROQ_API_KEY)
Deployment	Render / Railway / Docker
SSE	/runs/:id/stream


### 📦 Installation
pnpm install
cp .env.example .env

### 🔧 Environment Variables

PORT=4000
NODE_ENV=development
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/llm_lab?schema=public
GROQ_API_KEY=YOUR_KEY_HERE

# Frontend domain for CORS
FRONTEND_ORIGIN=https://llm-model-analyzer-frontend.onrender.com



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

GET  /health

GET  /experiments
POST /experiments
GET  /experiments/:id

POST /experiments/:id/run
GET  /runs/:runId
GET  /runs/:runId/stream   # SSE

GET  /experiments/:id/responses
GET  /experiments/:id/metrics

GET  /exports/:id.json
GET  /exports/:id.csv


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

### 🔬 Metrics Engine

All metrics are computed inside Node.js, including:
- completeness
- structure
- coherence
- redundancy
- lexical diversity
- length adequacy
- readability

overallQuality
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

pnpm install
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