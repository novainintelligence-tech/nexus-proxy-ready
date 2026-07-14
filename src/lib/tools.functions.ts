import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

const PROXYSCRAPE_BASE =
  "https://cdn.jsdelivr.net/gh/proxyscrape/free-proxy-list@main/proxies";

type PSProxy = {
  protocol: "http" | "https" | "socks4" | "socks5";
  ip: string;
  port: number;
  country?: string | null;
  country_code?: string | null;
  city?: string | null;
  anonymity?: string | null;
  ssl?: boolean | null;
  uptime_percent?: number | null;
  asn?: string | null;
  isp?: string | null;
  latency_ms?: number | null;
  last_checked?: number | null;
};

// ---------- Admin: sync from ProxyScrape ----------
const syncInput = z
  .object({
    protocol: z.enum(["all", "http", "https", "socks4", "socks5"]).default("all"),
    limit: z.number().int().min(1).max(20000).default(5000),
  })
  .default({ protocol: "all", limit: 5000 });

export const syncProxyScrape = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v) => syncInput.parse(v))
  .handler(async ({ context, data }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");

    const url =
      data.protocol === "all"
        ? `${PROXYSCRAPE_BASE}/all/data.json`
        : `${PROXYSCRAPE_BASE}/protocols/${data.protocol}/data.json`;

    const res = await fetch(url, { headers: { accept: "application/json" } });
    if (!res.ok) throw new Error(`ProxyScrape fetch failed: ${res.status}`);
    const list = (await res.json()) as PSProxy[];

    const rows = list.slice(0, data.limit).map((p) => ({
      ip: p.ip,
      port: p.port,
      username: "",
      password: "",
      proxy_type: "public",
      protocol: p.protocol,
      auth_type: "none",
      country: p.country ?? null,
      region: p.country_code ?? null,
      city: p.city ?? null,
      host: p.isp ?? null,
      speed_mbps:
        p.latency_ms && p.latency_ms > 0
          ? Math.min(999, Math.round((1000 / p.latency_ms) * 100) / 100)
          : null,
      blacklist: false,
      status: "available",
      source: "proxyscrape",
      external_id: `${p.protocol}:${p.ip}:${p.port}`,
      last_seen_at: new Date().toISOString(),
    }));

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let inserted = 0;
    const chunk = 500;
    for (let i = 0; i < rows.length; i += chunk) {
      const slice = rows.slice(i, i + chunk);
      const { error, count } = await supabaseAdmin
        .from("proxies")
        .upsert(slice, {
          onConflict: "ip,port,username",
          count: "exact",
          ignoreDuplicates: false,
        });
      if (error) throw new Error(error.message);
      inserted += count ?? slice.length;
    }
    return { fetched: list.length, inserted, protocol: data.protocol };
  });

// ---------- Public list of free/synced proxies ----------
const listPublicInput = z
  .object({
    protocol: z.enum(["all", "http", "https", "socks4", "socks5"]).default("all"),
    country: z.string().optional(),
    limit: z.number().int().min(1).max(500).default(100),
    page: z.number().int().min(1).default(1),
  })
  .default({ protocol: "all", limit: 100, page: 1 });

export const listPublicProxies = createServerFn({ method: "POST" })
  .inputValidator((v) => listPublicInput.parse(v))
  .handler(async ({ data }) => {
    const sb = createClient<Database>(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY!,
      {
        auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
        global: {
          fetch: (input, init) => {
            const h = new Headers(init?.headers);
            const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
            if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) {
              h.delete("Authorization");
            }
            h.set("apikey", key);
            return fetch(input, { ...init, headers: h });
          },
        },
      },
    );
    const from = (data.page - 1) * data.limit;
    const to = from + data.limit - 1;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let q = supabaseAdmin
      .from("proxies")
      .select(
        "id, ip, port, protocol, country, region, city, host, speed_mbps, last_seen_at",
        { count: "exact" },
      )
      .eq("source", "proxyscrape")
      .order("last_seen_at", { ascending: false, nullsFirst: false })
      .range(from, to);
    if (data.protocol !== "all") q = q.eq("protocol", data.protocol);
    if (data.country) q = q.eq("country", data.country);
    const { data: rows, error, count } = await q;
    if (error) throw new Error(error.message);
    return {
      total: count ?? 0,
      rows: (rows ?? []).map((r: any) => ({
        id: r.id,
        ip: String(r.ip),
        port: r.port,
        protocol: r.protocol,
        country: r.country,
        countryCode: r.region,
        city: r.city,
        isp: r.host,
        speedMbps: r.speed_mbps ? Number(r.speed_mbps) : null,
        lastSeenAt: r.last_seen_at,
      })),
    };
  });

export const getProxyStats = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const total = await supabaseAdmin
    .from("proxies")
    .select("id", { count: "exact", head: true })
    .eq("source", "proxyscrape");
  const protos = ["http", "https", "socks4", "socks5"] as const;
  const counts: Record<string, number> = {};
  for (const p of protos) {
    const r = await supabaseAdmin
      .from("proxies")
      .select("id", { count: "exact", head: true })
      .eq("source", "proxyscrape")
      .eq("protocol", p);
    counts[p] = r.count ?? 0;
  }
  return { total: total.count ?? 0, byProtocol: counts };
});

// ---------- Proxy checker (TCP reachability + latency) ----------
async function tcpCheck(host: string, port: number, timeoutMs = 5000) {
  const started = Date.now();
  try {
    const mod: any = await import("cloudflare:sockets" as any).catch(() => null);
    if (!mod?.connect) {
      return { ok: false, latencyMs: null, note: "socket runtime unavailable" };
    }
    const socket = mod.connect(
      { hostname: host, port },
      { secureTransport: "off", allowHalfOpen: false },
    );
    const opened = socket.opened as Promise<unknown>;
    await Promise.race([
      opened,
      new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), timeoutMs)),
    ]);
    const latency = Date.now() - started;
    try {
      await socket.close();
    } catch {}
    return { ok: true, latencyMs: latency };
  } catch (e: any) {
    return { ok: false, latencyMs: null, error: e?.message ?? "connect failed" };
  }
}

const checkInput = z.object({
  host: z.string().min(1),
  port: z.number().int().min(1).max(65535),
  protocol: z.string().optional(),
});
export const checkProxy = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v) => checkInput.parse(v))
  .handler(async ({ data }) => {
    const r = await tcpCheck(data.host, data.port);
    return { host: data.host, port: data.port, protocol: data.protocol ?? null, ...r };
  });

const bulkCheckInput = z.object({
  list: z
    .array(z.string().min(3))
    .min(1)
    .max(50), // ip:port per line
});
export const bulkCheckProxies = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v) => bulkCheckInput.parse(v))
  .handler(async ({ data }) => {
    const parsed = data.list
      .map((s) => {
        const m = s.trim().match(/^([^:\s]+):(\d{1,5})$/);
        if (!m) return null;
        return { host: m[1], port: Number(m[2]) };
      })
      .filter(Boolean) as { host: string; port: number }[];
    const results = await Promise.all(
      parsed.map(async (p) => ({ ...p, ...(await tcpCheck(p.host, p.port, 4000)) })),
    );
    return { results };
  });

// ---------- IP lookup via ip-api.com ----------
const ipLookupInput = z.object({ ip: z.string().min(3) });
export const lookupIp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v) => ipLookupInput.parse(v))
  .handler(async ({ data }) => {
    const res = await fetch(`http://ip-api.com/json/${encodeURIComponent(data.ip)}`);
    if (!res.ok) throw new Error(`Lookup failed: ${res.status}`);
    return await res.json();
  });

// ---------- My IP ----------
export const getMyIp = createServerFn({ method: "GET" }).handler(async () => {
  const { getRequest } = await import("@tanstack/react-start/server");
  const req = getRequest();
  const h = req.headers;
  const ip =
    h.get("cf-connecting-ip") ||
    h.get("x-real-ip") ||
    (h.get("x-forwarded-for") || "").split(",")[0].trim() ||
    null;
  return { ip, country: h.get("cf-ipcountry") || null };
});