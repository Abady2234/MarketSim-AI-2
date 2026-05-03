import { Router } from "express";
import { db } from "@workspace/db";
import {
  simulationsTable,
  personasTable,
  simulationReportsTable,
} from "@workspace/db";
import {
  CreateSimulationBody,
  GetSimulationParams,
  DeleteSimulationParams,
  RunSimulationParams,
} from "@workspace/api-zod";
import { eq, desc, avg, count, isNotNull } from "drizzle-orm";
import { runSimulationEngine } from "./engine";

const router = Router();

router.get("/simulations", async (req, res) => {
  try {
    const simulations = await db
      .select()
      .from(simulationsTable)
      .orderBy(desc(simulationsTable.createdAt));
    res.json(simulations);
  } catch {
    res.status(500).json({ error: "Failed to list simulations" });
  }
});

router.get("/simulations/stats", async (req, res) => {
  try {
    const [totalResult, completedResult, avgResult, recentSimulations] = await Promise.all([
      db.select({ count: count() }).from(simulationsTable),
      db
        .select({ count: count() })
        .from(simulationsTable)
        .where(eq(simulationsTable.status, "completed")),
      db
        .select({ avg: avg(simulationsTable.acceptanceRate) })
        .from(simulationsTable)
        .where(isNotNull(simulationsTable.acceptanceRate)),
      db
        .select()
        .from(simulationsTable)
        .orderBy(desc(simulationsTable.createdAt))
        .limit(5),
    ]);

    res.json({
      totalSimulations: totalResult[0]?.count ?? 0,
      completedSimulations: completedResult[0]?.count ?? 0,
      avgAcceptanceRate: avgResult[0]?.avg ?? null,
      recentSimulations,
    });
  } catch {
    res.status(500).json({ error: "Failed to get stats" });
  }
});

router.get("/simulations/:id", async (req, res) => {
  const params = GetSimulationParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid simulation ID" });
    return;
  }

  try {
    const [simulation, personas, reports] = await Promise.all([
      db
        .select()
        .from(simulationsTable)
        .where(eq(simulationsTable.id, params.data.id))
        .limit(1),
      db
        .select()
        .from(personasTable)
        .where(eq(personasTable.simulationId, params.data.id))
        .orderBy(personasTable.orderIndex),
      db
        .select()
        .from(simulationReportsTable)
        .where(eq(simulationReportsTable.simulationId, params.data.id))
        .limit(1),
    ]);

    if (!simulation[0]) {
      res.status(404).json({ error: "Simulation not found" });
      return;
    }

    res.json({
      ...simulation[0],
      personas,
      report: reports[0] ?? null,
    });
  } catch {
    res.status(500).json({ error: "Failed to get simulation" });
  }
});

router.post("/simulations", async (req, res) => {
  const body = CreateSimulationBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }

  try {
    const inserted = await db
      .insert(simulationsTable)
      .values({
        title: "محاكاة جديدة",
        ideaText: body.data.ideaText,
        income: body.data.income ?? null,
        price: body.data.price ?? null,
        image1Url: body.data.image1Url ?? null,
        image2Url: body.data.image2Url ?? null,
        numPersonas: body.data.numPersonas ?? 7,
        status: "pending",
      })
      .returning();

    res.status(201).json(inserted[0]);
  } catch {
    res.status(500).json({ error: "Failed to create simulation" });
  }
});

router.delete("/simulations/:id", async (req, res) => {
  const params = DeleteSimulationParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid simulation ID" });
    return;
  }

  try {
    const deleted = await db
      .delete(simulationsTable)
      .where(eq(simulationsTable.id, params.data.id))
      .returning();

    if (!deleted[0]) {
      res.status(404).json({ error: "Simulation not found" });
      return;
    }

    res.status(204).send();
  } catch {
    res.status(500).json({ error: "Failed to delete simulation" });
  }
});

router.post("/simulations/:id/run", async (req, res) => {
  const params = RunSimulationParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid simulation ID" });
    return;
  }

  const simulation = await db
    .select()
    .from(simulationsTable)
    .where(eq(simulationsTable.id, params.data.id))
    .limit(1);

  if (!simulation[0]) {
    res.status(404).json({ error: "Simulation not found" });
    return;
  }

  if (simulation[0].status === "running") {
    res.status(409).json({ error: "Simulation is already running" });
    return;
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.flushHeaders();

  await runSimulationEngine(params.data.id, res);
});

export default router;
