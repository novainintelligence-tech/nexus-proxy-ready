import { Router } from "express";
import { db, cartItemsTable, proxiesTable, paymentsTable, subscriptionsTable, userProxiesTable } from "@workspace/db";
import { eq, and, gt, inArray } from "drizzle-orm";
import { requireAuth, getDbUser } from "../lib/auth";
import { getCryptoAmount, CRYPTO_WALLETS } from "../lib/crypto-wallets";
import { generateId } from "../lib/id";
import { logger } from "../lib/logger";

const router = Router();

// POST /api/purchase
// Body: { currency: 'BTC' | 'USDT_TRC20' | 'USDC' }
// Converts the user's reserved cart into a pending crypto Payment that, once
// admin-confirmed, becomes an active subscription with the proxies assigned.
router.post("/purchase", requireAuth, async (req, res): Promise<void> => {
  const clerkId = (req as any).clerkUserId;
  const user = await getDbUser(clerkId);
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  if (user.isBanned) { res.status(403).json({ error: "Account banned" }); return; }

  const { currency } = req.body;
  if (!currency || !CRYPTO_WALLETS[currency]) {
    res.status(400).json({ error: "Invalid currency" }); return;
  }

  const now = new Date();
  const cartRows = await db
    .select({
      id: cartItemsTable.id,
      proxyId: cartItemsTable.proxyId,
      priceCents: proxiesTable.priceCents,
    })
    .from(cartItemsTable)
    .leftJoin(proxiesTable, eq(cartItemsTable.proxyId, proxiesTable.id))
    .where(and(eq(cartItemsTable.userId, user.id), gt(cartItemsTable.expiresAt, now)));

  if (cartRows.length === 0) {
    res.status(400).json({ error: "Cart is empty or all reservations expired" }); return;
  }

  const totalCents = cartRows.reduce((acc, r) => acc + (r.priceCents ?? 0), 0);
  const proxyIds = cartRows.map((r) => r.proxyId);

  const walletInfo = CRYPTO_WALLETS[currency];
  const cryptoAmount = getCryptoAmount(totalCents, currency);

  // Create a synthetic à-la-carte plan-less payment by reusing the payments table.
  // We mark planId as 'cart' so the admin-confirm flow knows it's a cart purchase.
  const [payment] = await db.insert(paymentsTable).values({
    id: generateId("pay"),
    userId: user.id,
    planId: "cart",
    amountUsd: totalCents,
    currency,
    cryptoAmount,
    walletAddress: walletInfo.address,
    status: "pending",
    adminNote: `Cart purchase: ${proxyIds.length} proxies (${proxyIds.join(",")})`,
  }).returning();

  // Create a pending subscription tied to this cart purchase (1 month default for now)
  const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const [sub] = await db.insert(subscriptionsTable).values({
    id: generateId("sub"),
    userId: user.id,
    planId: "cart",
    paymentId: payment.id,
    status: "pending",
    bandwidthGbTotal: 0,
    bandwidthUsedMb: 0,
    startsAt: now,
    expiresAt,
  }).returning();

  // Reserve the proxies firmly: mark them assigned + create user_proxies rows pending sub
  // We use a transaction for safety
  await db.transaction(async (tx) => {
    for (const row of cartRows) {
      const [proxy] = await tx.select().from(proxiesTable)
        .where(and(eq(proxiesTable.id, row.proxyId), eq(proxiesTable.isAssigned, false)))
        .limit(1);
      if (!proxy) continue; // skip if grabbed by someone else (rare with reservation)
      await tx.update(proxiesTable).set({ isAssigned: true }).where(eq(proxiesTable.id, proxy.id));
      await tx.insert(userProxiesTable).values({
        id: generateId("up"),
        userId: user.id,
        proxyId: proxy.id,
        subscriptionId: sub.id,
        isActive: false, // becomes active when admin confirms payment
      });
    }
    // Clear the cart
    await tx.delete(cartItemsTable).where(inArray(cartItemsTable.id, cartRows.map((r) => r.id)));
  });

  logger.info({ userId: user.id, paymentId: payment.id, subscriptionId: sub.id, count: proxyIds.length }, "Cart purchased");
  res.status(201).json({ payment, subscription: sub });
});

export default router;
