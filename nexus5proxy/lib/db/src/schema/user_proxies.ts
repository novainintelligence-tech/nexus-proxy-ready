import { pgTable, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const userProxiesTable = pgTable("user_proxies", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  proxyId: text("proxy_id").notNull(),
  subscriptionId: text("subscription_id").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  assignedAt: timestamp("assigned_at", { withTimezone: true }).notNull().defaultNow(),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
});

export const insertUserProxySchema = createInsertSchema(userProxiesTable);
export type InsertUserProxy = z.infer<typeof insertUserProxySchema>;
export type UserProxy = typeof userProxiesTable.$inferSelect;
