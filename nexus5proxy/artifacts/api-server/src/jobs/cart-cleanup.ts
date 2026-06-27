import { db, cartItemsTable } from "@workspace/db";
import { sql } from "drizzle-orm";
import { logger } from "../lib/logger";

export async function runCartCleanup(): Promise<void> {
  const result = await db.delete(cartItemsTable)
    .where(sql`${cartItemsTable.expiresAt} <= now()`)
    .returning({ id: cartItemsTable.id });
  if (result.length > 0) {
    logger.info({ released: result.length }, "Cart cleanup: expired reservations released");
  }
}

export function startCartCleanupJob(): void {
  // Run every minute
  setInterval(() => {
    runCartCleanup().catch((err) => {
      logger.error({ err }, "Cart cleanup job failed");
    });
  }, 60 * 1000);
  runCartCleanup().catch(() => {});
  logger.info("Cart cleanup job started (runs every 1 minute)");
}
