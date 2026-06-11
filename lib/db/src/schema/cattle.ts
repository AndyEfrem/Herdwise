import { pgTable, text, serial, timestamp, integer, real, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { investorsTable } from "./investors";

export const cattleTable = pgTable("cattle", {
  id: serial("id").primaryKey(),
  tag: text("tag").notNull(),
  previousTag: text("previous_tag"),
  breed: text("breed").notNull(),
  sex: text("sex"),
  stage: text("stage"),
  description: text("description"),
  status: text("status").notNull().default("active"),
  weightKg: real("weight_kg"),
  dateReceived: date("date_received", { mode: "string" }),
  notes: text("notes"),
  investorId: integer("investor_id").references(() => investorsTable.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertCattleSchema = createInsertSchema(cattleTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertCattle = z.infer<typeof insertCattleSchema>;
export type Cattle = typeof cattleTable.$inferSelect;
