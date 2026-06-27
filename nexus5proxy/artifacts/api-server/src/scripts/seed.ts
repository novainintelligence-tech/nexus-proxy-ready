/**
 * Seed plans and demo proxies for NexusProxy.
 * Idempotent: re-runnable safely (uses ON CONFLICT DO UPDATE / DO NOTHING).
 *
 * Usage:
 *   pnpm --filter @workspace/api-server run seed
 */
import { db, plansTable, proxiesTable } from "@workspace/db";
import { sql } from "drizzle-orm";

const PLANS = [
  // SOCKS5 Residential (by IP) — Monthly
  { id: "socks5-res-ip-900",     name: "Residential 900 IPs",      planType: "monthly", priceUsd: 9900,  bandwidthGb: 0, proxyCount: 900,   durationDays: 30, proxyTypes: ["residential"], features: ["900 dedicated IPs", "30-day access", "SOCKS5 / HTTP"] },
  { id: "socks5-res-ip-1300",    name: "Residential 1,300 IPs",    planType: "monthly", priceUsd: 13000, bandwidthGb: 0, proxyCount: 1300,  durationDays: 30, proxyTypes: ["residential"], features: ["1,300 dedicated IPs", "30-day access"] },
  { id: "socks5-res-ip-1800",    name: "Residential 1,800 IPs",    planType: "monthly", priceUsd: 15480, bandwidthGb: 0, proxyCount: 1800,  durationDays: 30, proxyTypes: ["residential"], features: ["1,800 dedicated IPs", "30-day access"] },
  { id: "socks5-res-ip-5200",    name: "Residential 5,200 IPs",    planType: "monthly", priceUsd: 36400, bandwidthGb: 0, proxyCount: 5200,  durationDays: 30, proxyTypes: ["residential"], features: ["5,200 dedicated IPs", "30-day access"] },
  { id: "socks5-res-ip-11000",   name: "Residential 11,000 IPs",   planType: "premium", priceUsd: 50600, bandwidthGb: 0, proxyCount: 11000, durationDays: 30, proxyTypes: ["residential"], features: ["11,000 dedicated IPs", "30-day access", "Best value"] },
  // SOCKS5 Residential (by IP) — Daily
  { id: "socks5-res-ip-d10",  name: "Residential 10 IPs (Daily)",  planType: "daily", priceUsd: 200,  bandwidthGb: 0, proxyCount: 10,  durationDays: 1, proxyTypes: ["residential"], features: ["10 IPs · 24h"] },
  { id: "socks5-res-ip-d25",  name: "Residential 25 IPs (Daily)",  planType: "daily", priceUsd: 450,  bandwidthGb: 0, proxyCount: 25,  durationDays: 1, proxyTypes: ["residential"], features: ["25 IPs · 24h"] },
  { id: "socks5-res-ip-d50",  name: "Residential 50 IPs (Daily)",  planType: "daily", priceUsd: 800,  bandwidthGb: 0, proxyCount: 50,  durationDays: 1, proxyTypes: ["residential"], features: ["50 IPs · 24h"] },
  { id: "socks5-res-ip-d100", name: "Residential 100 IPs (Daily)", planType: "daily", priceUsd: 1500, bandwidthGb: 0, proxyCount: 100, durationDays: 1, proxyTypes: ["residential"], features: ["100 IPs · 24h"] },
  // SOCKS5 Residential (by GB) — Standard
  { id: "socks5-res-gb-60",    name: "Residential 60 GB",    planType: "monthly", priceUsd: 12000,  bandwidthGb: 60,   proxyCount: 0, durationDays: 30, proxyTypes: ["residential"], features: ["60 GB / month", "Pay-per-GB"] },
  { id: "socks5-res-gb-130",   name: "Residential 130 GB",   planType: "monthly", priceUsd: 19500,  bandwidthGb: 130,  proxyCount: 0, durationDays: 30, proxyTypes: ["residential"], features: ["130 GB / month"] },
  { id: "socks5-res-gb-500",   name: "Residential 500 GB",   planType: "monthly", priceUsd: 48000,  bandwidthGb: 500,  proxyCount: 0, durationDays: 30, proxyTypes: ["residential"], features: ["500 GB / month"] },
  { id: "socks5-res-gb-1000",  name: "Residential 1 TB",     planType: "monthly", priceUsd: 75000,  bandwidthGb: 1000, proxyCount: 0, durationDays: 30, proxyTypes: ["residential"], features: ["1 TB / month"] },
  { id: "socks5-res-gb-3000",  name: "Residential 3 TB",     planType: "premium", priceUsd: 180000, bandwidthGb: 3000, proxyCount: 0, durationDays: 30, proxyTypes: ["residential"], features: ["3 TB / month", "Enterprise"] },
  // SOCKS5 Residential (by GB) — Daily
  { id: "socks5-res-gb-d5",   name: "Residential 5 GB (Daily)",  planType: "daily", priceUsd: 300,  bandwidthGb: 5,  proxyCount: 0, durationDays: 1, proxyTypes: ["residential"], features: ["5 GB · 24h"] },
  { id: "socks5-res-gb-d10",  name: "Residential 10 GB (Daily)", planType: "daily", priceUsd: 500,  bandwidthGb: 10, proxyCount: 0, durationDays: 1, proxyTypes: ["residential"], features: ["10 GB · 24h"] },
  { id: "socks5-res-gb-d20",  name: "Residential 20 GB (Daily)", planType: "daily", priceUsd: 900,  bandwidthGb: 20, proxyCount: 0, durationDays: 1, proxyTypes: ["residential"], features: ["20 GB · 24h"] },
  { id: "socks5-res-gb-d50",  name: "Residential 50 GB (Daily)", planType: "daily", priceUsd: 2000, bandwidthGb: 50, proxyCount: 0, durationDays: 1, proxyTypes: ["residential"], features: ["50 GB · 24h"] },
  // Rotating ISP (by GB)
  { id: "rotating-isp-130",  name: "Rotating ISP 130 GB",  planType: "monthly", priceUsd: 19500,  bandwidthGb: 130,  proxyCount: 0, durationDays: 30, proxyTypes: ["isp"], features: ["130 GB rotating ISP"] },
  { id: "rotating-isp-500",  name: "Rotating ISP 500 GB",  planType: "monthly", priceUsd: 48000,  bandwidthGb: 500,  proxyCount: 0, durationDays: 30, proxyTypes: ["isp"], features: ["500 GB rotating ISP"] },
  { id: "rotating-isp-1000", name: "Rotating ISP 1 TB",    planType: "monthly", priceUsd: 75000,  bandwidthGb: 1000, proxyCount: 0, durationDays: 30, proxyTypes: ["isp"], features: ["1 TB rotating ISP"] },
  { id: "rotating-isp-3000", name: "Rotating ISP 3 TB",    planType: "premium", priceUsd: 180000, bandwidthGb: 3000, proxyCount: 0, durationDays: 30, proxyTypes: ["isp"], features: ["3 TB rotating ISP", "Enterprise"] },
  // Unlimited Residential
  { id: "unlimited-res-7d",  name: "Unlimited Residential 7 Days",  planType: "premium", priceUsd: 56000,  bandwidthGb: 999999, proxyCount: 0, durationDays: 7,  proxyTypes: ["residential"], features: ["Unlimited bandwidth", "7-day access"] },
  { id: "unlimited-res-15d", name: "Unlimited Residential 15 Days", planType: "premium", priceUsd: 105000, bandwidthGb: 999999, proxyCount: 0, durationDays: 15, proxyTypes: ["residential"], features: ["Unlimited bandwidth", "15-day access"] },
  { id: "unlimited-res-30d", name: "Unlimited Residential 30 Days", planType: "premium", priceUsd: 165000, bandwidthGb: 999999, proxyCount: 0, durationDays: 30, proxyTypes: ["residential"], features: ["Unlimited bandwidth", "30-day access"] },
];

const DEMO_PROXIES = [
  // residential
  { id: "prx_demo_us_1", ip: "192.0.2.10",  port: 8000, username: "user_us1", password: "pass_us1", proxyType: "residential", country: "US", state: "California",  city: "Los Angeles",   isp: "Comcast",        latencyMs: 45,  priceCents: 150 },
  { id: "prx_demo_us_2", ip: "192.0.2.11",  port: 8001, username: "user_us2", password: "pass_us2", proxyType: "residential", country: "US", state: "New York",    city: "New York City", isp: "Verizon",        latencyMs: 38,  priceCents: 150 },
  { id: "prx_demo_de_1", ip: "192.0.2.12",  port: 8002, username: "user_de1", password: "pass_de1", proxyType: "residential", country: "DE", state: "Berlin",      city: "Berlin",        isp: "Deutsche Telekom", latencyMs: 78, priceCents: 150 },
  { id: "prx_demo_uk_1", ip: "192.0.2.13",  port: 8003, username: "user_uk1", password: "pass_uk1", proxyType: "residential", country: "GB", state: "England",     city: "London",        isp: "BT",             latencyMs: 65,  priceCents: 150 },
  { id: "prx_demo_fr_1", ip: "192.0.2.14",  port: 8004, username: "user_fr1", password: "pass_fr1", proxyType: "residential", country: "FR", state: "Île-de-France", city: "Paris",       isp: "Orange",         latencyMs: 71,  priceCents: 150 },
  // datacenter
  { id: "prx_demo_dc_1", ip: "192.0.2.20",  port: 8100, username: "user_dc1", password: "pass_dc1", proxyType: "datacenter",  country: "US", state: "Virginia",    city: "Ashburn",       isp: "AWS",            latencyMs: 12,  priceCents: 80 },
  { id: "prx_demo_dc_2", ip: "192.0.2.21",  port: 8101, username: "user_dc2", password: "pass_dc2", proxyType: "datacenter",  country: "DE", state: "Hesse",       city: "Frankfurt",     isp: "DigitalOcean",   latencyMs: 25,  priceCents: 80 },
  { id: "prx_demo_dc_3", ip: "192.0.2.22",  port: 8102, username: "user_dc3", password: "pass_dc3", proxyType: "datacenter",  country: "SG", state: "Singapore",   city: "Singapore",     isp: "Linode",         latencyMs: 110, priceCents: 80 },
  // isp
  { id: "prx_demo_isp_1", ip: "192.0.2.30", port: 8200, username: "user_isp1", password: "pass_isp1", proxyType: "isp",       country: "US", state: "Texas",       city: "Dallas",        isp: "Spectrum",       latencyMs: 32,  priceCents: 200 },
  { id: "prx_demo_isp_2", ip: "192.0.2.31", port: 8201, username: "user_isp2", password: "pass_isp2", proxyType: "isp",       country: "NL", state: "Noord-Holland", city: "Amsterdam",   isp: "KPN",            latencyMs: 42,  priceCents: 200 },
  // mobile
  { id: "prx_demo_mob_1", ip: "192.0.2.40", port: 8300, username: "user_mob1", password: "pass_mob1", proxyType: "mobile",    country: "US", state: "Florida",     city: "Miami",         isp: "T-Mobile",       latencyMs: 88,  priceCents: 250 },
];

async function main() {
  console.log("Seeding plans...");
  for (const plan of PLANS) {
    await db.insert(plansTable).values({
      ...plan,
      description: plan.name,
      isActive: true,
    }).onConflictDoUpdate({
      target: plansTable.id,
      set: {
        name: plan.name,
        description: plan.name,
        planType: plan.planType,
        priceUsd: plan.priceUsd,
        bandwidthGb: plan.bandwidthGb,
        proxyCount: plan.proxyCount,
        durationDays: plan.durationDays,
        proxyTypes: plan.proxyTypes,
        features: plan.features,
        isActive: true,
      },
    });
  }
  console.log(`✓ ${PLANS.length} plans seeded`);

  // Deactivate any old "demo" plans not in our seed list
  await db.execute(sql`UPDATE plans SET is_active = false WHERE id IN ('plan_starter','plan_daily_starter','plan_pro','plan_business') AND id NOT IN (${sql.raw(PLANS.map((p) => `'${p.id}'`).join(","))})`);

  console.log("Seeding demo proxies (only if absent)...");
  let inserted = 0;
  for (const p of DEMO_PROXIES) {
    const result = await db.insert(proxiesTable).values({
      ...p,
      status: "working",
      lastCheckedAt: new Date(),
    }).onConflictDoNothing();
    if ((result as any).rowCount && (result as any).rowCount > 0) inserted++;
  }
  console.log(`✓ ${inserted} new demo proxies inserted (existing untouched)`);

  console.log("Done.");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
