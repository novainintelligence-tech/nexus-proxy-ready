import { logger } from "./logger";

export interface FetchedProxy {
  ip: string;
  port: number;
  protocol: string; // 'http' | 'https' | 'socks4' | 'socks5'
  source: string;
}

const SOURCES: { name: string; url: string; protocol: string }[] = [
  { name: "proxyscrape", protocol: "http",   url: "https://api.proxyscrape.com/v2/?request=getproxies&protocol=http&timeout=5000&country=all&format=text" },
  { name: "proxyscrape", protocol: "socks4", url: "https://api.proxyscrape.com/v2/?request=getproxies&protocol=socks4&timeout=5000&country=all&format=text" },
  { name: "proxyscrape", protocol: "socks5", url: "https://api.proxyscrape.com/v2/?request=getproxies&protocol=socks5&timeout=5000&country=all&format=text" },
  { name: "proxylist",   protocol: "http",   url: "https://www.proxy-list.download/api/v1/get?type=http" },
  { name: "proxylist",   protocol: "https",  url: "https://www.proxy-list.download/api/v1/get?type=https" },
  { name: "proxylist",   protocol: "socks4", url: "https://www.proxy-list.download/api/v1/get?type=socks4" },
  { name: "proxylist",   protocol: "socks5", url: "https://www.proxy-list.download/api/v1/get?type=socks5" },
];

const IP_PORT_RE = /^(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}):(\d{2,5})$/;

async function fetchSource(name: string, url: string, protocol: string): Promise<FetchedProxy[]> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 15_000);
    const res = await fetch(url, { signal: ctrl.signal });
    clearTimeout(t);
    if (!res.ok) {
      logger.warn({ name, status: res.status }, "Proxy source returned non-OK");
      return [];
    }
    const text = await res.text();
    const lines = text.split(/\r?\n/);
    const out: FetchedProxy[] = [];
    for (const line of lines) {
      const trimmed = line.trim();
      const m = IP_PORT_RE.exec(trimmed);
      if (!m) continue;
      const port = Number(m[2]);
      if (!Number.isFinite(port) || port <= 0 || port > 65535) continue;
      out.push({ ip: m[1]!, port, protocol, source: name });
    }
    return out;
  } catch (err) {
    logger.warn({ err: (err as Error).message, name }, "Proxy source fetch failed");
    return [];
  }
}

/**
 * Fetch raw proxies from configured public sources.
 * De-duplicated by ip:port (first source wins).
 */
export async function fetchPublicProxies(): Promise<FetchedProxy[]> {
  const results = await Promise.all(SOURCES.map((s) => fetchSource(s.name, s.url, s.protocol)));
  const seen = new Set<string>();
  const merged: FetchedProxy[] = [];
  for (const batch of results) {
    for (const p of batch) {
      const key = `${p.ip}:${p.port}`;
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(p);
    }
  }
  logger.info({ count: merged.length, sources: results.map((r) => r.length) }, "Fetched public proxies");
  return merged;
}
