import { logger } from "./logger";
import { classifyProxy } from "./proxy-classify";

export interface EnrichmentData {
  country: string | null;
  state: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  isp: string | null;
  asn: string | null;
  proxyType: string;
}

/**
 * Enrich a proxy IP using free ip-api.com endpoint.
 * Free tier: 45 req/min. Caller is responsible for throttling.
 */
export async function enrichProxyIp(ip: string): Promise<EnrichmentData | null> {
  try {
    const url = `http://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,country,regionName,city,lat,lon,isp,org,as`;
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 8000);
    const res = await fetch(url, { signal: ctrl.signal });
    clearTimeout(t);
    if (!res.ok) return null;
    const json: any = await res.json();
    if (json.status !== "success") return null;

    const isp: string | null = json.isp ?? json.org ?? null;
    const asn: string | null = json.as ?? null;

    return {
      country: json.country ?? null,
      state: json.regionName ?? null,
      city: json.city ?? null,
      latitude: typeof json.lat === "number" ? json.lat : null,
      longitude: typeof json.lon === "number" ? json.lon : null,
      isp,
      asn,
      proxyType: classifyProxy(isp, asn),
    };
  } catch (err) {
    logger.warn({ err, ip }, "Enrichment failed");
    return null;
  }
}
