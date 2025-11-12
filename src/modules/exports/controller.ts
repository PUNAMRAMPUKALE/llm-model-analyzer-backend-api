// src/modules/exports/controller.ts
import { Router } from "express";
import { prisma } from "../../infra/prisma.js";

export const exportsRouter = Router();

/** CSV helpers */
const esc = (x: any) => {
  const v = typeof x === "string" ? x : JSON.stringify(x ?? "");
  return `"${v.replace(/"/g, '""')}"`;
};

/** Flatten Experiment -> Run -> Response (+Metric) into one row per response */
function flattenAll(experiments: any[]) {
  const rows: any[] = [];
  for (const e of experiments) {
    for (const run of e.runs ?? []) {
      for (const r of run.responses ?? []) {
        rows.push({
          experimentId: e.id,
          experimentTitle: e.title,
          experimentModel: e.model,
          experimentPrompt: e.prompt,
          experimentCreatedAt: e.createdAt,

          runId: run.id,
          runStatus: run.status,
          runStartedAt: run.startedAt,
          runCompletedAt: run.completedAt,

          responseId: r.id,
          responseCreatedAt: r.createdAt,
          latencyMs: r.latencyMs,
          tokensIn: r.tokensIn,
          tokensOut: r.tokensOut,
          params: r.params,
          overallQuality: r.metric?.overallQuality ?? null,
          scores: r.metric?.scores ?? {},
          details: r.metric?.details ?? {},
          responseText: r.text,
        });
      }
    }
  }
  return rows;
}

/** Download a single CSV that contains EVERY response (all experiments/runs) */
exportsRouter.get("/flat.csv", async (_req, res) => {
  const experiments = await prisma.experiment.findMany({
    orderBy: { createdAt: "asc" },
    include: {
      runs: {
        orderBy: { startedAt: "asc" },
        include: {
          responses: {
            orderBy: { createdAt: "asc" },
            include: { metric: true }, // ✅ <- THIS is the correct nesting
          },
        },
      },
    },
  });

  const rows = flattenAll(experiments);
  const headers = [
    "experimentId","experimentTitle","experimentModel","experimentPrompt","experimentCreatedAt",
    "runId","runStatus","runStartedAt","runCompletedAt",
    "responseId","responseCreatedAt","latencyMs","tokensIn","tokensOut","params",
    "overallQuality","scores","details","responseText",
  ];

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", 'attachment; filename="experiments-all.csv"');
  res.write(headers.join(",") + "\n");
  for (const row of rows) res.write(headers.map(h => esc(row[h])).join(",") + "\n");
  res.end();
});

/** Optional JSON version (handy for debugging) */
exportsRouter.get("/flat.json", async (_req, res) => {
  const experiments = await prisma.experiment.findMany({
    orderBy: { createdAt: "asc" },
    include: {
      runs: {
        orderBy: { startedAt: "asc" },
        include: {
          responses: { orderBy: { createdAt: "asc" }, include: { metric: true } },
        },
      },
    },
  });
  res.json(flattenAll(experiments));
});
