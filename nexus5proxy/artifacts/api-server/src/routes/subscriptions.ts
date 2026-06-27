import { Router } from "express";
import { db, subscriptionsTable, plansTable, userProxiesTable, proxiesTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth, getDbUser } from "../lib/auth";

const router = Router();

router.get("/subscriptions", requireAuth, async (req, res): Promise<void> => {
  const clerkId = (req as any).clerkUserId;
  const user = await getDbUser(clerkId);
  if (!user) { res.status(404).json({ error: "User not found" }); return; }

  const subs = await db
    .select({
      id: subscriptionsTable.id,
      userId: subscriptionsTable.userId,
      planId: subscriptionsTable.planId,
      planName: plansTable.name,
      status: subscriptionsTable.status,
      bandwidthGbTotal: subscriptionsTable.bandwidthGbTotal,
      bandwidthUsedMb: subscriptionsTable.bandwidthUsedMb,
      startsAt: subscriptionsTable.startsAt,
      expiresAt: subscriptionsTable.expiresAt,
      createdAt: subscriptionsTable.createdAt,
    })
    .from(subscriptionsTable)
    .leftJoin(plansTable, eq(subscriptionsTable.planId, plansTable.id))
    .where(eq(subscriptionsTable.userId, user.id))
    .orderBy(desc(subscriptionsTable.createdAt));
  res.json(subs);
});

router.get("/subscriptions/active", requireAuth, async (req, res): Promise<void> => {
  const clerkId = (req as any).clerkUserId;
  const user = await getDbUser(clerkId);
  if (!user) { res.status(404).json({ error: "User not found" }); return; }

  const [sub] = await db.select().from(subscriptionsTable)
    .where(and(eq(subscriptionsTable.userId, user.id), eq(subscriptionsTable.status, "active")))
    .orderBy(desc(subscriptionsTable.createdAt))
    .limit(1);
  if (!sub) { res.status(404).json({ error: "No active subscription" }); return; }

  const [plan] = await db.select().from(plansTable).where(eq(plansTable.id, sub.planId)).limit(1);

  const proxies = await db
    .select({
      id: userProxiesTable.id,
      proxyId: userProxiesTable.proxyId,
      ip: proxiesTable.ip,
      port: proxiesTable.port,
      username: proxiesTable.username,
      password: proxiesTable.password,
      proxyType: proxiesTable.proxyType,
      country: proxiesTable.country,
      isActive: userProxiesTable.isActive,
      assignedAt: userProxiesTable.assignedAt,
    })
    .from(userProxiesTable)
    .leftJoin(proxiesTable, eq(userProxiesTable.proxyId, proxiesTable.id))
    .where(and(eq(userProxiesTable.subscriptionId, sub.id), eq(userProxiesTable.isActive, true)));

  const totalBandwidthMb = sub.bandwidthGbTotal * 1024;
  const bandwidthRemainingMb = Math.max(0, totalBandwidthMb - sub.bandwidthUsedMb);
  const remainingMs = sub.expiresAt ? sub.expiresAt.getTime() - Date.now() : null;
  const remainingHours = remainingMs !== null ? Math.max(0, Math.floor(remainingMs / (60 * 60 * 1000))) : null;

  res.json({ subscription: sub, plan, proxies, remainingHours, bandwidthRemainingMb });
});

export default router;
