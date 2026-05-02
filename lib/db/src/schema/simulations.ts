import { pgTable, text, serial, integer, real, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const simulationsTable = pgTable("simulations", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  ideaText: text("idea_text").notNull(),
  status: text("status").notNull().default("pending"),
  acceptanceRate: real("acceptance_rate"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const personasTable = pgTable("personas", {
  id: serial("id").primaryKey(),
  simulationId: integer("simulation_id").notNull().references(() => simulationsTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  age: integer("age").notNull(),
  profession: text("profession").notNull(),
  lifestyle: text("lifestyle").notNull(),
  digitalBehavior: text("digital_behavior").notNull(),
  opinion: text("opinion").notNull(),
  decision: text("decision").notNull(),
  dealBreaker: text("deal_breaker").notNull(),
  orderIndex: integer("order_index").notNull().default(0),
});

export const simulationReportsTable = pgTable("simulation_reports", {
  id: serial("id").primaryKey(),
  simulationId: integer("simulation_id").notNull().references(() => simulationsTable.id, { onDelete: "cascade" }),
  productCore: text("product_core").notNull(),
  targetSegment: text("target_segment").notNull(),
  competitiveAdvantage: text("competitive_advantage").notNull(),
  emotionalAcceptance: real("emotional_acceptance").notNull(),
  logicalAcceptance: real("logical_acceptance").notNull(),
  failurePatterns: text("failure_patterns").notNull(),
  successPatterns: text("success_patterns").notNull(),
  recommendation1: text("recommendation_1").notNull(),
  recommendation2: text("recommendation_2").notNull(),
  recommendation3: text("recommendation_3").notNull(),
});

export const insertSimulationSchema = createInsertSchema(simulationsTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertPersonaSchema = createInsertSchema(personasTable).omit({ id: true });
export const insertReportSchema = createInsertSchema(simulationReportsTable).omit({ id: true });

export type Simulation = typeof simulationsTable.$inferSelect;
export type InsertSimulation = z.infer<typeof insertSimulationSchema>;
export type Persona = typeof personasTable.$inferSelect;
export type InsertPersona = z.infer<typeof insertPersonaSchema>;
export type SimulationReport = typeof simulationReportsTable.$inferSelect;
export type InsertReport = z.infer<typeof insertReportSchema>;
