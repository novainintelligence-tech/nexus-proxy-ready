/**
 * Proxy scoring algorithm — produces a 0-100 score per proxy.
 * Used to rank inventory and auto-disable bad proxies.
 *
 * FINAL_SCORE =
 *   LATENCY (25%) + SUCCESS (25%) + UPTIME (20%) +
 *   ANONYMITY (10%) + LOCATION (5%) + TYPE (10%) + FRESHNESS (5%)
 */

export interface ScoreInput {
  latencyMs: number | null;
  successCount: number;
  failCount: number;
  anonymity: string | null;
  country: string | null;
  proxyType: string;
  lastCheckedAt: Date | null;
}

const PREMIUM_COUNTRIES = new Set([
  "United States", "United Kingdom", "Canada", "Germany",
  "France", "Australia", "Japan", "Netherlands", "Singapore",
]);

function latencyScore(ms: number | null): number {
  if (ms == null) return 0;
  if (ms < 200) return 100;
  if (ms < 500) return 80;
  if (ms < 1000) return 50;
  return 20;
}

function successScore(success: number, fail: number): number {
  const total = success + fail;
  if (total === 0) return 0;
  return Math.round((success / total) * 100);
}

function uptimeScore(success: number, fail: number): number {
  // Treat success rate as proxy for uptime — same series, different weight.
  return successScore(success, fail);
}

function anonymityScore(level: string | null): number {
  if (!level) return 50;
  const v = level.toLowerCase();
  if (v.includes("elite") || v.includes("high")) return 100;
  if (v.includes("anon")) return 70;
  if (v.includes("trans")) return 30;
  return 50;
}

function locationScore(country: string | null): number {
  if (!country) return 40;
  return PREMIUM_COUNTRIES.has(country) ? 100 : 70;
}

function typeScore(type: string): number {
  switch (type) {
    case "residential": return 100;
    case "mobile": return 95;
    case "isp": return 90;
    case "datacenter": return 70;
    default: return 60;
  }
}

function freshnessScore(checkedAt: Date | null): number {
  if (!checkedAt) return 0;
  const ageMin = (Date.now() - checkedAt.getTime()) / 60_000;
  if (ageMin < 5) return 100;
  if (ageMin < 30) return 80;
  if (ageMin < 120) return 50;
  return 20;
}

export function computeProxyScore(p: ScoreInput): number {
  const score =
    latencyScore(p.latencyMs) * 0.25 +
    successScore(p.successCount, p.failCount) * 0.25 +
    uptimeScore(p.successCount, p.failCount) * 0.20 +
    anonymityScore(p.anonymity) * 0.10 +
    locationScore(p.country) * 0.05 +
    typeScore(p.proxyType) * 0.10 +
    freshnessScore(p.lastCheckedAt) * 0.05;
  return Math.round(score);
}

export function scoreTier(score: number): "premium" | "high" | "usable" | "bad" {
  if (score >= 90) return "premium";
  if (score >= 75) return "high";
  if (score >= 50) return "usable";
  return "bad";
}
