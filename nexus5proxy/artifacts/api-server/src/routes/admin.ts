import { Router } from "express";
import {
  db, usersTable, paymentsTable, plansTable,
  subscriptionsTable, proxiesTable, userProxiesTable
} from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { requireAdmin } from "../lib/auth";
import { getCryptoAmount, CRYPTO_WALLETS } from "../lib/crypto-wallets";
import { generateId } from "../lib/id";
import { logger } from "../lib/logger";
import { generateProxyUsername, generateProxyPassword } from "../lib/proxy-creds";
import { getSetting, setSetting } from "../lib/system-settings";
import { confirmPaymentInDb } from "../lib/confirm-payment";

const router = Router();

// ── Stats ──────────────────────────────────────────────────────────────────
router.get("/admin/stats", requireAdmin, async (_req, res): Promise<void> => {
  const [{ count: totalUsers }] = await db.select({ count: sql<number>`count(*)` }).from(usersTable);
  const [{ count: activeSubscriptions }] = await db.select({ count: sql<number>`count(*)` })
    .from(subscriptionsTable).where(eq(subscriptionsTable.status, "active"));
  const [{ count: pendingPayments }] = await db.select({ count: sql<number>`count(*)` })
    .from(paymentsTable).where(eq(paymentsTable.status, "pending"));
  const [{ count: totalProxies }] = await db.select({ count: sql<number>`count(*)` }).from(proxiesTable);
  const [{ count: assignedProxies }] = await db.select({ count: sql<number>`count(*)` })
    .from(proxiesTable).where(eq(proxiesTable.isAssigned, true));
  const confirmedPayments = await db.select({ amt: paymentsTable.amountUsd })
    .from(paymentsTable).where(eq(paymentsTable.status, "confirmed"));
  const totalRevenueCents = confirmedPayments.reduce((a, p) => a + p.amt, 0);

  res.json({
    totalUsers: Number(totalUsers),
    activeSubscriptions: Number(activeSubscriptions),
    pendingPayments: Number(pendingPayments),
    totalProxies: Number(totalProxies),
    assignedProxies: Number(assignedProxies),
    totalRevenueCents,
  });
});

// ── Users ──────────────────────────────────────────────────────────────────
router.get("/admin/users", requireAdmin, async (_req, res): Promise<void> => {
  const users = await db.select().from(usersTable);
  res.json(users);
});

router.patch("/admin/users/:id/ban", requireAdmin, async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const { isBanned } = req.body;
  if (typeof isBanned !== "boolean") { res.status(400).json({ error: "isBanned boolean required" }); return; }

  const [updated] = await db.update(usersTable)
    .set({ isBanned })
    .where(eq(usersTable.id, rawId))
    .returning();

  if (!updated) { res.status(404).json({ error: "User not found" }); return; }
  res.json(updated);
});

// ── Payments ───────────────────────────────────────────────────────────────
router.get("/admin/payments", requireAdmin, async (_req, res): Promise<void> => {
  const payments = await db
    .select({
      id: paymentsTable.id,
      userId: paymentsTable.userId,
      userEmail: usersTable.email,
      planId: paymentsTable.planId,
      planName: plansTable.name,
      amountUsd: paymentsTable.amountUsd,
      currency: paymentsTable.currency,
      txHash: paymentsTable.txHash,
      status: paymentsTable.status,
      adminNote: paymentsTable.adminNote,
      createdAt: paymentsTable.createdAt,
    })
    .from(paymentsTable)
    .leftJoin(usersTable, eq(paymentsTable.userId, usersTable.id))
    .leftJoin(plansTable, eq(paymentsTable.planId, plansTable.id))
    .orderBy(paymentsTable.createdAt);
  res.json(payments);
});

router.patch("/admin/payments/:id/confirm", requireAdmin, async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const { adminNote } = req.body;

  const [payment] = await db.select().from(paymentsTable).where(eq(paymentsTable.id, rawId!)).limit(1);
  if (!payment) { res.status(404).json({ error: "Payment not found" }); return; }
  if (payment.status === "confirmed") { res.status(400).json({ error: "Already confirmed" }); return; }

  try {
    const updated = await confirmPaymentInDb(rawId!, adminNote ?? null);
    res.json(updated);
  } catch (e: any) {
    res.status(400).json({ error: e?.message ?? "Confirmation failed" });
  }
});

// ── Proxies ─────────────────────────────────────────────────────────────────
router.get("/admin/proxies", requireAdmin, async (_req, res): Promise<void> => {
  const proxies = await db.select().from(proxiesTable);
  res.json(proxies);
});

router.post("/admin/proxies", requireAdmin, async (req, res): Promise<void> => {
  const { ip, port, username, password, proxyType, country, city, isp, priceCents } = req.body;
  if (!ip || !port || !proxyType) {
    res.status(400).json({ error: "ip, port, proxyType required" }); return;
  }
  const [proxy] = await db.insert(proxiesTable).values({
    id: generateId("prx"),
    ip, port: Number(port),
    username: username || generateProxyUsername(),
    password: password || generateProxyPassword(),
    proxyType,
    country: country ?? null,
    city: city ?? null,
    isp: isp ?? null,
    priceCents: priceCents ?? 150,
  }).returning();
  res.status(201).json(proxy);
});

router.post("/admin/proxies/bulk", requireAdmin, async (req, res): Promise<void> => {
  const { proxyList, proxyType } = req.body;
  if (!proxyList || !proxyType) { res.status(400).json({ error: "proxyList and proxyType required" }); return; }

  const lines = (proxyList as string).split("\n").map((l: string) => l.trim()).filter(Boolean);
  let added = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const line of lines) {
    const parts = line.split(":");
    if (parts.length < 2) { errors.push(`Invalid format: ${line}`); skipped++; continue; }
    const [ip, portStr, username, password] = parts;
    const port = parseInt(portStr!, 10);
    if (isNaN(port)) { errors.push(`Invalid port: ${line}`); skipped++; continue; }
    try {
      await db.insert(proxiesTable).values({
        id: generateId("prx"),
        ip: ip!,
        port,
        username: username || generateProxyUsername(),
        password: password || generateProxyPassword(),
        proxyType,
      });
      added++;
    } catch (e: any) {
      errors.push(`Error adding ${line}: ${e.message}`);
      skipped++;
    }
  }
  res.status(201).json({ added, skipped, errors });
});

router.patch("/admin/proxies/:id", requireAdmin, async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const allowed = ["ip","port","username","password","proxyType","country","city","isp","priceCents","status","isActive","isAssigned","latencyMs"];
  const patch: Record<string, any> = {};
  for (const k of allowed) {
    if (req.body[k] !== undefined) patch[k] = req.body[k];
  }
  if (Object.keys(patch).length === 0) { res.status(400).json({ error: "No valid fields" }); return; }
  if (patch.port !== undefined) patch.port = Number(patch.port);
  const [updated] = await db.update(proxiesTable).set(patch).where(eq(proxiesTable.id, rawId!)).returning();
  if (!updated) { res.status(404).json({ error: "Proxy not found" }); return; }
  res.json(updated);
});

router.delete("/admin/proxies/:id", requireAdmin, async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  await db.update(proxiesTable).set({ isActive: false }).where(eq(proxiesTable.id, rawId!));
  res.json({ ok: true });
});

// ── Subscriptions ───────────────────────────────────────────────────────────
router.get("/admin/subscriptions", requireAdmin, async (_req, res): Promise<void> => {
  const subs = await db.select().from(subscriptionsTable);
  res.json(subs);
});

router.patch("/admin/subscriptions/:id", requireAdmin, async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const allowed = ["status","bandwidthGbTotal","bandwidthUsedMb","expiresAt"];
  const patch: Record<string, any> = {};
  for (const k of allowed) {
    if (req.body[k] !== undefined) patch[k] = req.body[k];
  }
  if (patch.expiresAt) patch.expiresAt = new Date(patch.expiresAt);
  if (Object.keys(patch).length === 0) { res.status(400).json({ error: "No valid fields" }); return; }
  const [updated] = await db.update(subscriptionsTable).set(patch).where(eq(subscriptionsTable.id, rawId!)).returning();
  if (!updated) { res.status(404).json({ error: "Subscription not found" }); return; }
  res.json(updated);
});

// ── System Settings ─────────────────────────────────────────────────────────
router.get("/admin/settings", requireAdmin, async (_req, res): Promise<void> => {
  const autoConfirm = await getSetting("auto_confirm_payments", false);
  res.json({ autoConfirmPayments: autoConfirm });
});

router.patch("/admin/settings", requireAdmin, async (req, res): Promise<void> => {
  if (req.body.autoConfirmPayments !== undefined) {
    await setSetting("auto_confirm_payments", !!req.body.autoConfirmPayments);
  }
  const autoConfirm = await getSetting("auto_confirm_payments", false);
  res.json({ autoConfirmPayments: autoConfirm });
});

// ── Plans ───────────────────────────────────────────────────────────────────
router.post("/admin/plans", requireAdmin, async (req, res): Promise<void> => {
  const { id, name, description, planType, priceUsd, bandwidthGb, proxyCount, durationDays, proxyTypes, features } = req.body;
  if (!id || !name || !planType || !priceUsd || !bandwidthGb || !durationDays) {
    res.status(400).json({ error: "Required fields missing" }); return;
  }
  const [plan] = await db.insert(plansTable).values({
    id, name, description: description ?? null,
    planType, priceUsd, bandwidthGb,
    proxyCount: proxyCount ?? 1,
    durationDays,
    proxyTypes: proxyTypes ?? ["residential"],
    features: features ?? [],
  }).returning();
  res.status(201).json(plan);
});

router.patch("/admin/plans/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = String(req.params.id);
  const allowed: Record<string, any> = {};
  const fields = [
    "name", "description", "planType", "priceUsd", "bandwidthGb",
    "proxyCount", "durationDays", "proxyTypes", "features", "isActive",
  ];
  for (const f of fields) {
    if (req.body[f] !== undefined) allowed[f] = req.body[f];
  }
  if (Object.keys(allowed).length === 0) {
    res.status(400).json({ error: "No editable fields supplied" }); return;
  }
  const [updated] = await db.update(plansTable).set(allowed).where(eq(plansTable.id, id)).returning();
  if (!updated) { res.status(404).json({ error: "Plan not found" }); return; }
  res.json(updated);
});

router.delete("/admin/plans/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = String(req.params.id);
  const [deleted] = await db.delete(plansTable).where(eq(plansTable.id, id)).returning();
  if (!deleted) { res.status(404).json({ error: "Plan not found" }); return; }
  res.json({ success: true, id: deleted.id });
});

// ── Proxy ingestion / health ─────────────────────────────────────────────────
router.post("/admin/proxies/ingest", requireAdmin, async (_req, res): Promise<void> => {
  const { runProxyIngestJob } = await import("../jobs/proxy-ingest");
  // Run async — can take 30+ seconds. Return immediately.
  runProxyIngestJob().catch((err) => {
    const { logger } = require("../lib/logger");
    logger.error({ err }, "Manual ingest failed");
  });
  res.json({ started: true, note: "Ingest running in background. Check stats in ~1 min." });
});

router.post("/admin/proxies/healthcheck", requireAdmin, async (_req, res): Promise<void> => {
  const { runProxyHealthJob } = await import("../jobs/proxy-health");
  const result = await runProxyHealthJob();
  res.json(result);
});

router.get("/admin/proxies/stats", requireAdmin, async (_req, res): Promise<void> => {
  const rows = await db.execute<any>(sql`
    select
      count(*)::int as total,
      count(*) filter (where is_active = true)::int as active,
      count(*) filter (where is_assigned = true)::int as assigned,
      count(*) filter (where status = 'working')::int as working,
      count(*) filter (where status = 'dead')::int as dead,
      count(*) filter (where status = 'untested')::int as untested,
      count(*) filter (where score >= 90)::int as premium,
      count(*) filter (where score >= 75 and score < 90)::int as high,
      count(*) filter (where score >= 50 and score < 75)::int as usable,
      count(*) filter (where score < 50)::int as bad,
      coalesce(round(avg(score))::int, 0) as avg_score
    from proxies
  `);
  const row = (rows as any).rows ? (rows as any).rows[0] : (rows as any)[0];
  res.json(row ?? {});
});

export default router;
