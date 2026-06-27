import { db, subscriptionsTable, userProxiesTable, proxiesTable } from "@workspace/db";
import { eq, and, lt } from "drizzle-orm";
import { logger } from "../lib/logger";

export async function runExpiryJob(): Promise<void> {
  const now = new Date();

  // Find active subscriptions that have expired
  const expired = await db.select().from(subscriptionsTable).where(
    and(
      eq(subscriptionsTable.status, "active"),
      lt(subscriptionsTable.expiresAt, now),
    )
  );

  for (const sub of expired) {
    // Expire subscription
    await db.update(subscriptionsTable)
      .set({ status: "expired" })
      .where(eq(subscriptionsTable.id, sub.id));

    // Revoke user proxies
    const userProxies = await db.select().from(userProxiesTable)
      .where(and(
        eq(userProxiesTable.subscriptionId, sub.id),
        eq(userProxiesTable.isActive, true),
      ));

    for (const up of userProxies) {
      await db.update(userProxiesTable)
        .set({ isActive: false, revokedAt: now })
        .where(eq(userProxiesTable.id, up.id));

      await db.update(proxiesTable)
        .set({ isAssigned: false })
        .where(eq(proxiesTable.id, up.proxyId));
    }

    logger.info({ subscriptionId: sub.id, proxiesRevoked: userProxies.length }, "Subscription expired");
  }

  if (expired.length > 0) {
    logger.info({ count: expired.length }, "Expiry job: expired subscriptions processed");
  }
}

export function startExpiryJob(): void {
  // Run every 5 minutes
  setInterval(() => {
    runExpiryJob().catch((err) => {
      logger.error({ err }, "Expiry job failed");
    });
  }, 5 * 60 * 1000);

  // Run immediately on startup
  runExpiryJob().catch((err) => {
    logger.error({ err }, "Initial expiry job failed");
  });

  logger.info("Subscription expiry job started (runs every 5 minutes)");
}
