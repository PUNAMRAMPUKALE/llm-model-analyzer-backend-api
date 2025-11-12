import { Router } from "express";
import { prisma } from "../../infra/prisma.js";
export const exportsRouter = Router();

// GET /exports/flat.csv – all experiments flattened
exportsRouter.get("/flat.csv", async (_req, res) => {
  try {
    const exps = await prisma.experiment.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        runs: {
          orderBy: { startedAt: "asc" },
          include: {
            responses: {
              orderBy: { createdAt: "asc" },
              include: { metric: true },
            },
          },
        },
      },
    });

    // flatten
    const rows: Array<Record<string, any>> = [];
    for (const e of exps) {
      for (const run of e.runs) {
        for (const r of run.responses) {
          rows.push({
            experimentId: e.id,
            experimentTitle: e.title,
            experimentModel: e.model,
            experimentPrompt: e.prompt,
            experimentCreatedAt: e.createdAt.toISOString(),
            responseId: r.id,
            latencyMs: r.latencyMs,
            tokensIn: r.tokensIn,
            tokensOut: r.tokensOut,
            params: r.params,
            overallQuality: r.metric?.overallQuality ?? null,
            scores: r.metric?.scores ?? {},
            responseText: r.text, // include output text
          });
        }
      }
    }

    // nothing to export → 204 avoids 502 and keeps UX clean
    if (rows.length === 0) return res.status(204).end();

    const headers = Object.keys(rows[0]);
    const esc = (x: any) => {
      const v = typeof x === "string" ? x : JSON.stringify(x ?? "");
      return `"${v.replace(/"/g, '""')}"`;
    };
    const lines = [headers.join(",")];
    for (const row of rows) lines.push(headers.map(h => esc((row as any)[h])).join(","));
    const csv = lines.join("\n");

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", 'attachment; filename="experiments.csv"');
    return res.status(200).send(csv);
  } catch (err) {
    console.error("CSV export failed:", err);
    return res.status(500).json({ error: "Export failed" });
  }
});
