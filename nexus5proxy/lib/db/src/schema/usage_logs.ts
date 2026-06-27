import { pgTable, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const usageLogsTable = pgTable("usage_logs", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  subscriptionId: text("subscription_id").notNull(),
  proxyId: text("proxy_id"),
  bytesUsed: integer("bytes_used").notNull().default(0),
  action: text("action").notNull(), // 'connect' | 'disconnect' | 'bandwidth_update'
  ipAddress: text("ip_address"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertUsageLogSchema = createInsertSchema(usageLogsTable).omit({ createdAt: true });
export type InsertUsageLog = z.infer<typeof insertUsageLogSchema>;
export type UsageLog = typeof usageLogsTable.$inferSelect;
