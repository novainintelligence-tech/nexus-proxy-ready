import { Router } from "express";
import { getAuth } from "@clerk/express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth, getDbUser } from "../lib/auth";
import { generateId } from "../lib/id";
import { logger } from "../lib/logger";

const router = Router();

router.post("/auth/sync", async (req, res): Promise<void> => {
  const auth = getAuth(req);
  const clerkId = auth?.userId;
  if (!clerkId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const email = (auth?.sessionClaims as any)?.email ?? (req.body?.email ?? "");
  let user = await getDbUser(clerkId);
  if (!user) {
    const [created] = await db
      .insert(usersTable)
      .values({ id: generateId("usr"), clerkId, email: email || clerkId + "@unknown" })
      .returning();
    user = created;
    logger.info({ userId: user.id }, "New user created");
  }
  res.json(user);
});

router.get("/auth/me", requireAuth, async (req, res): Promise<void> => {
  const clerkId = (req as any).clerkUserId;
  const user = await getDbUser(clerkId);
  if (!user) {
    res.status(404).json({ error: "User not found. Please sync first." });
    return;
  }
  if (user.isBanned) {
    res.status(403).json({ error: "Account banned." });
    return;
  }
  res.json(user);
});

export default router;
