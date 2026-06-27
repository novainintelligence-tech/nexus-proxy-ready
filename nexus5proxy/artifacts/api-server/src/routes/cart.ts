import { Router } from "express";
import { db, cartItemsTable, proxiesTable } from "@workspace/db";
import { eq, and, gt, sql } from "drizzle-orm";
import { requireAuth, getDbUser } from "../lib/auth";
import { generateId } from "../lib/id";
import { logger } from "../lib/logger";

const router = Router();

const RESERVATION_MINUTES = 15;

// GET /api/cart - get my cart items (with proxy details)
router.get("/cart", requireAuth, async (req, res): Promise<void> => {
  const clerkId = (req as any).clerkUserId;
  const user = await getDbUser(clerkId);
  if (!user) { res.status(404).json({ error: "User not found" }); return; }

  const now = new Date();
  const items = await db
    .select({
      id: cartItemsTable.id,
      proxyId: cartItemsTable.proxyId,
      expiresAt: cartItemsTable.expiresAt,
      createdAt: cartItemsTable.createdAt,
      ip: proxiesTable.ip,
      port: proxiesTable.port,
      proxyType: proxiesTable.proxyType,
      country: proxiesTable.country,
      city: proxiesTable.city,
      priceCents: proxiesTable.priceCents,
    })
    .from(cartItemsTable)
    .leftJoin(proxiesTable, eq(cartItemsTable.proxyId, proxiesTable.id))
    .where(and(eq(cartItemsTable.userId, user.id), gt(cartItemsTable.expiresAt, now)));

  const totalCents = items.reduce((acc, i) => acc + (i.priceCents ?? 0), 0);
  res.json({ items, totalCents, reservationMinutes: RESERVATION_MINUTES });
});

// POST /api/cart/add - reserve a proxy in the cart
router.post("/cart/add", requireAuth, async (req, res): Promise<void> => {
  const clerkId = (req as any).clerkUserId;
  const user = await getDbUser(clerkId);
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  if (user.isBanned) { res.status(403).json({ error: "Account banned" }); return; }

  const { proxyId } = req.body;
  if (!proxyId) { res.status(400).json({ error: "proxyId required" }); return; }

  const expiresAt = new Date(Date.now() + RESERVATION_MINUTES * 60 * 1000);

  try {
    const result = await db.transaction(async (tx) => {
      // Cleanup any expired reservation for this proxy first
      await tx.delete(cartItemsTable)
        .where(and(eq(cartItemsTable.proxyId, proxyId), sql`${cartItemsTable.expiresAt} <= now()`));

      const [proxy] = await tx.select().from(proxiesTable)
        .where(and(eq(proxiesTable.id, proxyId), eq(proxiesTable.isActive, true), eq(proxiesTable.isAssigned, false)))
        .limit(1);
      if (!proxy) {
        return { error: "Proxy unavailable", code: 410 } as const;
      }
      // Try insert (uniqueIndex on proxyId enforces single-reservation)
      const [item] = await tx.insert(cartItemsTable).values({
        id: generateId("cart"),
        userId: user.id,
        proxyId,
        expiresAt,
      }).returning();
      return { item } as const;
    });

    if ("error" in result) {
      res.status(result.code ?? 400).json({ error: result.error });
      return;
    }
    logger.info({ userId: user.id, proxyId }, "Proxy reserved in cart");
    res.status(201).json(result.item);
  } catch (e: any) {
    if (e.code === "23505") {
      res.status(409).json({ error: "This proxy is no longer available" });
      return;
    }
    logger.error({ err: e }, "Failed to add to cart");
    res.status(500).json({ error: "Failed to add to cart" });
  }
});

// DELETE /api/cart/:id - remove from cart
router.delete("/cart/:id", requireAuth, async (req, res): Promise<void> => {
  const clerkId = (req as any).clerkUserId;
  const user = await getDbUser(clerkId);
  if (!user) { res.status(404).json({ error: "User not found" }); return; }

  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  await db.delete(cartItemsTable).where(and(eq(cartItemsTable.id, rawId), eq(cartItemsTable.userId, user.id)));
  res.json({ ok: true });
});

export default router;
