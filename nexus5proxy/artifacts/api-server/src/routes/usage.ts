import { Router } from "express";
import { db, usageLogsTable, subscriptionsTable, userProxiesTable } from "@workspace/db";
import { eq, and, sum, count } from "drizzle-orm";
import { requireAuth, getDbUser } from "../lib/auth";

const router = Router();

router.get("/usage/stats", requireAuth, async (req, res): Promise<void> => {
  const clerkId = (req as any).clerkUserId;
  const user = await getDbUser(clerkId);
  if (!user) { res.status(404).json({ error: "User not found" }); return; }

  const logs = await db.select().from(usageLogsTable).where(eq(usageLogsTable.userId, user.id));
  const totalBytes = logs.reduce((acc, l) => acc + l.bytesUsed, 0);
  const totalBandwidthUsedMb = Math.floor(totalBytes / (1024 * 1024));
  const lastLog = logs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];

  const activeProxies = await db.select().from(userProxiesTable).where(
    and(eq(userProxiesTable.userId, user.id), eq(userProxiesTable.isActive, true))
  );

  res.json({
    totalBandwidthUsedMb,
    activeProxies: activeProxies.length,
    totalConnections: logs.length,
    lastActivity: lastLog?.createdAt ?? null,
  });
});

export default router;
