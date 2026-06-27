import { pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const cartItemsTable = pgTable(
  "cart_items",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    proxyId: text("proxy_id").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    proxyUnique: uniqueIndex("cart_items_proxy_unique").on(table.proxyId),
  }),
);

export const insertCartItemSchema = createInsertSchema(cartItemsTable).omit({ createdAt: true });
export type InsertCartItem = z.infer<typeof insertCartItemSchema>;
export type CartItem = typeof cartItemsTable.$inferSelect;
