import { Router } from "express";
import { db, userProxiesTable, proxiesTable, cartItemsTable } from "@workspace/db";
import { eq, and, ilike, or, sql, notInArray } from "drizzle-orm";
import { requireAuth, getDbUser } from "../lib/auth";

const router = Router();

// GET /api/proxies - browse all available proxies (public listing)
// Query: search, country, type, limit
router.get("/proxies", async (req, res): Promise<void> => {
  const search = (req.query["search"] as string | undefined)?.trim();
  const country = (req.query["country"] as string | undefined)?.trim();
  const type = (req.query["type"] as string | undefined)?.trim();
  const limit = Math.min(Number(req.query["limit"]) || 100, 500);

  // Get reserved proxy IDs (active reservations only)
  const reserved = await db
    .select({ proxyId: cartItemsTable.proxyId })
    .from(cartItemsTable)
    .where(sql`${cartItemsTable.expiresAt} > now()`);
  const reservedIds = reserved.map((r) => r.proxyId);

  const conditions = [eq(proxiesTable.isActive, true), eq(proxiesTable.isAssigned, false)];
  if (search) {
    conditions.push(or(ilike(proxiesTable.ip, `%${search}%`), ilike(proxiesTable.country, `%${search}%`))!);
  }
  if (country && country !== "all") conditions.push(eq(proxiesTable.country, country));
  if (type && type !== "all") conditions.push(eq(proxiesTable.proxyType, type));
  if (reservedIds.length > 0) conditions.push(notInArray(proxiesTable.id, reservedIds));

  const list = await db
    .select({
      id: proxiesTable.id,
      ip: proxiesTable.ip,
      port: proxiesTable.port,
      proxyType: proxiesTable.proxyType,
      country: proxiesTable.country,
      city: proxiesTable.city,
      isp: proxiesTable.isp,
      latencyMs: proxiesTable.latencyMs,
      status: proxiesTable.status,
      lastCheckedAt: proxiesTable.lastCheckedAt,
      priceCents: proxiesTable.priceCents,
    })
    .from(proxiesTable)
    .where(and(...conditions))
    .limit(limit);

  res.json(list);
});

// GET /api/proxies/countries - list of distinct countries available
router.get("/proxies/countries", async (_req, res): Promise<void> => {
  const rows = await db
    .selectDistinct({ country: proxiesTable.country })
    .from(proxiesTable)
    .where(and(eq(proxiesTable.isActive, true), eq(proxiesTable.isAssigned, false)));
  res.json(rows.map((r) => r.country).filter(Boolean));
});

// GET /api/proxies/my - user's assigned proxies
router.get("/proxies/my", requireAuth, async (req, res): Promise<void> => {
  const clerkId = (req as any).clerkUserId;
  const user = await getDbUser(clerkId);
  if (!user) { res.status(404).json({ error: "User not found" }); return; }

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
      city: proxiesTable.city,
      status: proxiesTable.status,
      lastCheckedAt: proxiesTable.lastCheckedAt,
      isActive: userProxiesTable.isActive,
      assignedAt: userProxiesTable.assignedAt,
    })
    .from(userProxiesTable)
    .leftJoin(proxiesTable, eq(userProxiesTable.proxyId, proxiesTable.id))
    .where(and(
      eq(userProxiesTable.userId, user.id),
      eq(userProxiesTable.isActive, true),
    ));

  res.json(proxies);
});

export default router;
