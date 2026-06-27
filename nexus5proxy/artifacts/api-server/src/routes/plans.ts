import { Router } from "express";
import { db, plansTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

router.get("/plans", async (_req, res): Promise<void> => {
  const plans = await db.select().from(plansTable).where(eq(plansTable.isActive, true));
  res.json(plans);
});

export default router;
