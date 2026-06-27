import {
  db, paymentsTable, plansTable, subscriptionsTable, proxiesTable, userProxiesTable,
} from "@workspace/db";
import { eq, and, ne, desc, inArray } from "drizzle-orm";
import { generateId } from "./id";
import { logger } from "./logger";

/**
 * Shared payment-confirmation logic used by:
 *   - admin manual confirm
 *   - user submit-hash auto-confirm
 *
 * Handles both the legacy "buy a plan" flow and the new "cart" flow.
 */
export async function confirmPaymentInDb(paymentId: string, adminNote: string | null) {
  const [payment] = await db
    .select()
    .from(paymentsTable)
    .where(eq(paymentsTable.id, paymentId))
    .limit(1);
  if (!payment) throw new Error("Payment not found");
  if (payment.status === "confirmed") return payment;

  const now = new Date();

  // ── Cart-purchase flow ─────────────────────────────────────────────────
  if (payment.planId === "cart") {
    const [updatedPayment] = await db
      .update(paymentsTable)
      .set({ status: "confirmed", confirmedAt: now, adminNote })
      .where(eq(paymentsTable.id, paymentId))
      .returning();

    const [pendingSub] = await db
      .select()
      .from(subscriptionsTable)
      .where(eq(subscriptionsTable.paymentId, paymentId))
      .limit(1);

    if (pendingSub) {
      const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      await db
        .update(subscriptionsTable)
        .set({ status: "active", startsAt: now, expiresAt })
        .where(eq(subscriptionsTable.id, pendingSub.id));
      await db
        .update(userProxiesTable)
        .set({ isActive: true })
        .where(eq(userProxiesTable.subscriptionId, pendingSub.id));
      logger.info({ paymentId, subscriptionId: pendingSub.id }, "Cart payment confirmed");
    }
    return updatedPayment;
  }

  // ── Standard plan-purchase flow ────────────────────────────────────────
  const [plan] = await db.select().from(plansTable).where(eq(plansTable.id, payment.planId)).limit(1);
  if (!plan) throw new Error("Plan not found");

  const expiresAt = new Date(now.getTime() + plan.durationDays * 24 * 60 * 60 * 1000);

  const [updatedPayment] = await db
    .update(paymentsTable)
    .set({ status: "confirmed", confirmedAt: now, adminNote })
    .where(eq(paymentsTable.id, paymentId))
    .returning();

  const [existingSub] = await db
    .select()
    .from(subscriptionsTable)
    .where(and(eq(subscriptionsTable.userId, payment.userId), eq(subscriptionsTable.paymentId, paymentId)))
    .limit(1);

  let subscriptionId: string;
  if (existingSub) {
    await db
      .update(subscriptionsTable)
      .set({ status: "active", startsAt: now, expiresAt, bandwidthUsedMb: 0 })
      .where(eq(subscriptionsTable.id, existingSub.id));
    subscriptionId = existingSub.id;
  } else {
    const [sub] = await db
      .insert(subscriptionsTable)
      .values({
        id: generateId("sub"),
        userId: payment.userId,
        planId: payment.planId,
        paymentId,
        status: "active",
        bandwidthGbTotal: plan.bandwidthGb,
        bandwidthUsedMb: 0,
        startsAt: now,
        expiresAt,
      })
      .returning();
    subscriptionId = sub!.id;
  }

  const neededCount = plan.proxyCount;
  const allowedTypes = (plan.proxyTypes ?? []).filter(Boolean);

  // Smart selection: only active+working+unassigned proxies, optionally filtered
  // by the plan's allowed types, ordered by score DESC so users get the best inventory.
  let query = db
    .select()
    .from(proxiesTable)
    .where(
      and(
        eq(proxiesTable.isActive, true),
        eq(proxiesTable.isAssigned, false),
        ne(proxiesTable.status, "dead"),
        ...(allowedTypes.length ? [inArray(proxiesTable.proxyType, allowedTypes)] : []),
      ),
    )
    .orderBy(desc(proxiesTable.score))
    .limit(neededCount);

  const availableProxies = await query;

  for (const proxy of availableProxies) {
    await db.insert(userProxiesTable).values({
      id: generateId("up"),
      userId: payment.userId,
      proxyId: proxy.id,
      subscriptionId,
      isActive: true,
    });
    await db.update(proxiesTable).set({ isAssigned: true }).where(eq(proxiesTable.id, proxy.id));
  }

  logger.info(
    {
      paymentId,
      subscriptionId,
      proxiesAssigned: availableProxies.length,
      requested: neededCount,
      typesFilter: allowedTypes,
    },
    "Payment confirmed (smart-assigned proxies)",
  );

  return updatedPayment;
}
