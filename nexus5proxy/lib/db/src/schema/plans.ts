import { pgTable, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const plansTable = pgTable("plans", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  planType: text("plan_type").notNull(), // 'daily' | 'monthly'
  priceUsd: integer("price_usd").notNull(), // cents
  bandwidthGb: integer("bandwidth_gb").notNull(),
  proxyCount: integer("proxy_count").notNull().default(1),
  durationDays: integer("duration_days").notNull(), // 1 for daily, 30 for monthly
  proxyTypes: text("proxy_types").array().notNull().default(["residential"]),
  features: text("features").array().notNull().default([]),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertPlanSchema = createInsertSchema(plansTable).omit({ createdAt: true });
export type InsertPlan = z.infer<typeof insertPlanSchema>;
export type Plan = typeof plansTable.$inferSelect;
