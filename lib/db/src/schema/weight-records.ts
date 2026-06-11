import { pgTable, text, serial, timestamp, integer, real, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { cattleTable } from "./cattle";

export const weightRecordsTable = pgTable("weight_records", {
  id: serial("id").primaryKey(),
  cattleId: integer("cattle_id").notNull().references(() => cattleTable.id, { onDelete: "cascade" }),
  weightKg: real("weight_kg").notNull(),
  recordedAt: date("recorded_at", { mode: "string" }).notNull(),
  notes: text("notes"),
  recordedBy: text("recorded_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertWeightRecordSchema = createInsertSchema(weightRecordsTable).omit({ id: true, createdAt: true });
export type InsertWeightRecord = z.infer<typeof insertWeightRecordSchema>;
export type WeightRecord = typeof weightRecordsTable.$inferSelect;
