import { pgTable, text, serial, timestamp, integer, boolean, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { cattleTable } from "./cattle";

export const treatmentsTable = pgTable("treatments", {
  id: serial("id").primaryKey(),
  cattleId: integer("cattle_id").notNull().references(() => cattleTable.id),
  treatmentType: text("treatment_type").notNull(),
  scheduledDate: date("scheduled_date", { mode: "string" }).notNull(),
  completed: boolean("completed").notNull().default(false),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertTreatmentSchema = createInsertSchema(treatmentsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertTreatment = z.infer<typeof insertTreatmentSchema>;
export type Treatment = typeof treatmentsTable.$inferSelect;
