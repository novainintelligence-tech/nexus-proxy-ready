import { logger } from "./logger";

export interface HealthCheckResult {
  ok: boolean;
  latencyMs: number | null;
  anonymity: string | null;
}

const TEST_URLS = [
  "http://httpbin.org/ip",
  "http://api.ipify.org?format=json",
];

/**
 * Probe a proxy by issuing a small GET through it.
 * Currently supports HTTP/HTTPS proxies (uses fetch with manual proxy via undici).
 * For SOCKS proxies the check returns ok=false (would need a socks-agent dep).
 */
export async function healthCheckProxy(opts: {
  ip: string;
  port: number;
  protocol: string;
  username?: string;
  password?: string;
  timeoutMs?: number;
}): Promise<HealthCheckResult> {
  const { ip, port, protocol, timeoutMs = 7000 } = opts;
  const t0 = Date.now();

  // We only support http(s) probes here. SOCKS would require socks-proxy-agent.
  if (protocol === "socks4" || protocol === "socks5") {
    return { ok: false, latencyMs: null, anonymity: null };
  }

  try {
    const { ProxyAgent } = await import("undici");
    const auth =
      opts.username && opts.password
        ? `${encodeURIComponent(opts.username)}:${encodeURIComponent(opts.password)}@`
        : "";
    const dispatcher = new ProxyAgent({ uri: `http://${auth}${ip}:${port}` });

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    const url = TEST_URLS[Math.floor(Math.random() * TEST_URLS.length)]!;

    const res = await fetch(url, {
      signal: ctrl.signal,
      // @ts-expect-error - undici dispatcher option
      dispatcher,
    });
    clearTimeout(timer);

    if (!res.ok) return { ok: false, latencyMs: null, anonymity: null };

    const body: any = await res.json().catch(() => ({}));
    const observedIp: string | undefined = body.ip || body.origin;

    // Anonymity heuristic: if observed IP equals the proxy's IP it's elite.
    let anonymity: string | null = null;
    if (observedIp) {
      anonymity = observedIp === ip ? "elite" : "anonymous";
    }

    return { ok: true, latencyMs: Date.now() - t0, anonymity };
  } catch (err) {
    logger.debug({ err: (err as Error).message, ip, port }, "Health check failed");
    return { ok: false, latencyMs: null, anonymity: null };
  }
}
