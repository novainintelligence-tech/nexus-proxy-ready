import { Router } from "express";
import { db, paymentsTable, plansTable, subscriptionsTable, usersTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth, getDbUser } from "../lib/auth";
import { getCryptoAmount, CRYPTO_WALLETS } from "../lib/crypto-wallets";
import { generateId } from "../lib/id";
import { logger } from "../lib/logger";
import { getSetting } from "../lib/system-settings";
import { verifyPaymentOnChain } from "../lib/crypto-verify";
import { confirmPaymentInDb } from "../lib/confirm-payment";

const router = Router();

router.get("/payments", requireAuth, async (req, res): Promise<void> => {
  const clerkId = (req as any).clerkUserId;
  const user = await getDbUser(clerkId);
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  const payments = await db.select().from(paymentsTable).where(eq(paymentsTable.userId, user.id));
  res.json(payments);
});

router.post("/payments", requireAuth, async (req, res): Promise<void> => {
  const clerkId = (req as any).clerkUserId;
  const user = await getDbUser(clerkId);
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  if (user.isBanned) { res.status(403).json({ error: "Account banned" }); return; }

  const { planId, currency } = req.body;
  if (!planId || !currency) { res.status(400).json({ error: "planId and currency required" }); return; }
  if (!CRYPTO_WALLETS[currency]) { res.status(400).json({ error: "Invalid currency" }); return; }

  const [plan] = await db.select().from(plansTable).where(eq(plansTable.id, planId)).limit(1);
  if (!plan || !plan.isActive) { res.status(404).json({ error: "Plan not found" }); return; }

  const walletInfo = CRYPTO_WALLETS[currency];
  const cryptoAmount = getCryptoAmount(plan.priceUsd, currency);

  const [payment] = await db.insert(paymentsTable).values({
    id: generateId("pay"),
    userId: user.id,
    planId,
    amountUsd: plan.priceUsd,
    currency,
    cryptoAmount,
    walletAddress: walletInfo.address,
    status: "pending",
  }).returning();

  logger.info({ paymentId: payment.id, userId: user.id }, "Payment created");
  res.status(201).json(payment);
});

router.patch("/payments/:id/submit-hash", requireAuth, async (req, res): Promise<void> => {
  const clerkId = (req as any).clerkUserId;
  const user = await getDbUser(clerkId);
  if (!user) { res.status(404).json({ error: "User not found" }); return; }

  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const { txHash } = req.body;
  if (!txHash) { res.status(400).json({ error: "txHash required" }); return; }

  const [payment] = await db.select().from(paymentsTable)
    .where(and(eq(paymentsTable.id, rawId), eq(paymentsTable.userId, user.id)))
    .limit(1);

  if (!payment) { res.status(404).json({ error: "Payment not found" }); return; }
  if (payment.status !== "pending") { res.status(400).json({ error: "Payment is not pending" }); return; }

  const [updated] = await db.update(paymentsTable)
    .set({ txHash, status: "pending" })
    .where(eq(paymentsTable.id, rawId))
    .returning();

  // ── Auto-confirm if enabled ─────────────────────────────────────────────
  const autoConfirm = await getSetting("auto_confirm_payments", false);
  if (autoConfirm) {
    try {
      const result = await verifyPaymentOnChain({
        currency: payment.currency,
        txHash,
        walletAddress: payment.walletAddress ?? "",
        expectedAmount: payment.cryptoAmount ?? "0",
      });
      if (result.verified) {
        const confirmed = await confirmPaymentInDb(rawId!, "auto-confirmed via on-chain verification");
        logger.info({ paymentId: rawId, amountReceived: result.amountReceived }, "Auto-confirmed");
        res.json(confirmed);
        return;
      }
      // Verified=false → leave pending, flag for admin review
      await db.update(paymentsTable)
        .set({ adminNote: `Needs admin review: ${result.reason}` })
        .where(eq(paymentsTable.id, rawId!));
      logger.warn({ paymentId: rawId, reason: result.reason }, "Auto-confirm failed, needs review");
    } catch (e: any) {
      // Network/timeout → flag for admin review
      await db.update(paymentsTable)
        .set({ adminNote: `Needs admin review: verification API error (${e?.message ?? "unknown"})` })
        .where(eq(paymentsTable.id, rawId!));
      logger.warn({ paymentId: rawId, err: e?.message }, "Auto-confirm API error");
    }
  }

  res.json(updated);
});

export default router;
