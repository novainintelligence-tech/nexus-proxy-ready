import { db, proxiesTable } from "@workspace/db";
import { sql } from "drizzle-orm";
import { logger } from "../lib/logger";
import { fetchPublicProxies } from "../lib/proxy-fetch";
import { enrichProxyIp } from "../lib/proxy-enrich";
import { generateProxyUsername, generateProxyPassword } from "../lib/proxy-creds";
import { generateId } from "../lib/id";
import { getSetting } from "../lib/system-settings";

const MAX_NEW_PER_RUN = 200;     // safety cap
const ENRICH_RPS = 35;           // ip-api.com free limit ~45/min, stay under

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function runProxyIngestJob(): Promise<{ inserted: number; skipped: number }> {
  const enabled = await getSetting<boolean>("proxy_ingest_enabled", false);
  if (!enabled) {
    logger.debug("Proxy ingest disabled in settings, skipping");
    return { inserted: 0, skipped: 0 };
  }

  const fetched = await fetchPublicProxies();
  if (!fetched.length) return { inserted: 0, skipped: 0 };

  // Existing ip:port set so we don't enrich duplicates
  const existing = await db
    .select({ ip: proxiesTable.ip, port: proxiesTable.port })
    .from(proxiesTable);
  const existingKeys = new Set(existing.map((e) => `${e.ip}:${e.port}`));

  const fresh = fetched.filter((p) => !existingKeys.has(`${p.ip}:${p.port}`)).slice(0, MAX_NEW_PER_RUN);
  logger.info({ fetched: fetched.length, fresh: fresh.length, existing: existing.length }, "Proxy ingest starting");

  let inserted = 0;
  for (const p of fresh) {
    const enrichment = await enrichProxyIp(p.ip);
    try {
      await db.insert(proxiesTable).values({
        id: generateId("px"),
        ip: p.ip,
        port: p.port,
        username: generateProxyUsername(),
        password: generateProxyPassword(),
        protocol: p.protocol,
        proxyType: enrichment?.proxyType ?? "datacenter",
        country: enrichment?.country ?? null,
        state: enrichment?.state ?? null,
        city: enrichment?.city ?? null,
        latitude: enrichment?.latitude ?? null,
        longitude: enrichment?.longitude ?? null,
        isp: enrichment?.isp ?? null,
        asn: enrichment?.asn ?? null,
        source: p.source,
        status: "untested",
        priceCents: 150,
      }).onConflictDoNothing();
      inserted++;
    } catch (err) {
      logger.warn({ err: (err as Error).message, ip: p.ip }, "Insert failed");
    }
    // throttle for ip-api.com
    await sleep(Math.ceil(1000 / ENRICH_RPS));
  }

  // Quick stats
  const [{ count: total } = { count: 0 }] = await db.execute<{ count: number }>(
    sql`select count(*)::int as count from proxies`,
  ) as any;
  logger.info({ inserted, total }, "Proxy ingest finished");

  return { inserted, skipped: fetched.length - inserted };
}

export function startProxyIngestJob(): void {
  const intervalMs = 15 * 60 * 1000; // every 15 min
  setInterval(() => {
    runProxyIngestJob().catch((err) => logger.error({ err }, "Proxy ingest failed"));
  }, intervalMs);
  // Don't run immediately on startup — gated by setting + can be heavy
  logger.info("Proxy ingest job scheduled (every 15 min, gated by 'proxy_ingest_enabled')");
}
