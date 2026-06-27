import { db, proxiesTable } from "@workspace/db";
import { eq, or, isNull, lt, sql } from "drizzle-orm";
import { logger } from "../lib/logger";
import { healthCheckProxy } from "../lib/proxy-health";
import { computeProxyScore } from "../lib/proxy-score";

const BATCH_SIZE = 30;
const STALE_AGE_MIN = 30;
const CONCURRENCY = 6;

async function pickBatch() {
  const staleCutoff = new Date(Date.now() - STALE_AGE_MIN * 60_000);
  return db
    .select()
    .from(proxiesTable)
    .where(
      or(
        eq(proxiesTable.status, "untested"),
        isNull(proxiesTable.lastCheckedAt),
        lt(proxiesTable.lastCheckedAt, staleCutoff),
      ),
    )
    .orderBy(sql`coalesce(${proxiesTable.lastCheckedAt}, '1970-01-01') asc`)
    .limit(BATCH_SIZE);
}

async function checkAndUpdate(p: any): Promise<{ ok: boolean; score: number }> {
  const result = await healthCheckProxy({
    ip: p.ip,
    port: p.port,
    protocol: p.protocol ?? "http",
    username: p.username,
    password: p.password,
  });

  const successCount = (p.successCount ?? 0) + (result.ok ? 1 : 0);
  const failCount = (p.failCount ?? 0) + (result.ok ? 0 : 1);
  const now = new Date();

  const score = computeProxyScore({
    latencyMs: result.latencyMs ?? p.latencyMs,
    successCount,
    failCount,
    anonymity: result.anonymity ?? p.anonymity,
    country: p.country,
    proxyType: p.proxyType,
    lastCheckedAt: now,
  });

  let status: string;
  if (!result.ok) status = "dead";
  else if (result.latencyMs && result.latencyMs > 1500) status = "slow";
  else status = "working";

  // Auto-disable junk: too many fails AND low score
  const shouldDisable = score < 50 && failCount >= 3;

  await db
    .update(proxiesTable)
    .set({
      successCount,
      failCount,
      latencyMs: result.latencyMs ?? p.latencyMs,
      anonymity: result.anonymity ?? p.anonymity,
      lastCheckedAt: now,
      status,
      score,
      ...(shouldDisable ? { isActive: false } : {}),
    })
    .where(eq(proxiesTable.id, p.id));

  return { ok: result.ok, score };
}

export async function runProxyHealthJob(): Promise<{ checked: number; ok: number }> {
  const batch = await pickBatch();
  if (!batch.length) return { checked: 0, ok: 0 };

  let okCount = 0;
  // Run in chunks of CONCURRENCY
  for (let i = 0; i < batch.length; i += CONCURRENCY) {
    const slice = batch.slice(i, i + CONCURRENCY);
    const results = await Promise.all(slice.map((p) => checkAndUpdate(p).catch(() => ({ ok: false, score: 0 }))));
    okCount += results.filter((r) => r.ok).length;
  }
  logger.info({ checked: batch.length, ok: okCount }, "Proxy health job finished");
  return { checked: batch.length, ok: okCount };
}

export function startProxyHealthJob(): void {
  const intervalMs = 5 * 60 * 1000;
  setInterval(() => {
    runProxyHealthJob().catch((err) => logger.error({ err }, "Proxy health job failed"));
  }, intervalMs);
  logger.info("Proxy health job started (every 5 min, batch size 30)");
}
