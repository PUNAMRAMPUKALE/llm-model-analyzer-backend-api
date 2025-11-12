// src/app.ts
import express from "express";
import cors from "cors";
import morgan from "morgan";
import "express-async-errors";
import { ENV } from "./config/env.js";
import { experimentsRouter } from "./modules/experiments/controller.js";
import { runsRouter } from "./modules/runs/controller.js";
import { exportsRouter } from "./modules/exports/controller.js";

// Allow one or more origins via env (comma-separated)
const allowed = (process.env.FRONTEND_ORIGIN ?? "")
  .split(",")
  .map(s => s.trim())
  .filter(Boolean);

export function createApp() {
  const app = express();

  app.use(
    cors({
      origin: (origin, cb) => {
        if (!origin) return cb(null, true);                 // curl/health
        if (allowed.length === 0) return cb(null, true);    // fallback: open
        if (allowed.includes(origin)) return cb(null, true);
        return cb(new Error("Not allowed by CORS"));
      },
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization", "Accept"],
      credentials: false,
    })
  );
  app.options("*", cors()); // preflight

  app.use(express.json({ limit: "1mb" }));
  app.use(morgan("dev"));

  app.get("/health", (_req, res) => res.json({ status: "ok", env: ENV.NODE_ENV }));

  app.use("/experiments", experimentsRouter);
  app.use("/runs", runsRouter);
  app.use("/exports", exportsRouter);

  // error handler
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((err: any, _req: any, res: any, _next: any) => {
    console.error(err);
    res.status(500).json({ error: err?.message ?? "Internal error" });
    // ^ if CORS rejects, you'll see "Not allowed by CORS" here
  });

  return app;
}
