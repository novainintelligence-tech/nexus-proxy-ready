import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

// ----- public: plans -----
export const listPlans = createServerFn({ method: "GET" }).handler(async () => {
  const sb = createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
  );
  const { data, error } = await sb
    .from("plans")
    .select("*")
    .eq("active", true)
    .order("sort_order");
  if (error) throw new Error(error.message);
  return data ?? [];
});

// ----- profile / me -----
export const getMe = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId, claims } = context;
    const [{ data: profile }, { data: roles }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", userId),
    ]);
    return {
      id: userId,
      email: claims.email ?? profile?.email ?? "",
      name: profile?.display_name ?? "",
      balance: (profile?.balance_cents ?? 0) / 100,
      referralCode: profile?.referral_code ?? "",
      role: roles?.some((r) => r.role === "admin") ? "admin" : "user",
    };
  });

// ----- proxies (mine) -----
export const listMyProxies = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("proxies")
      .select("id, ip, port, username, password, proxy_type, country, region, city, host, status")
      .eq("assigned_to", context.userId);
    if (error) throw new Error(error.message);
    return (data ?? []).map((p) => ({
      id: p.id,
      ip: String(p.ip),
      port: p.port,
      username: p.username,
      password: p.password,
      proxyType: p.proxy_type,
      country: p.country,
      region: p.region,
      city: p.city,
    }));
  });

// ----- available proxies (browse) -----
const browseInput = z
  .object({
    country: z.string().optional(),
    proxyType: z.string().optional(),
    limit: z.number().int().min(1).max(200).default(50),
  })
  .default({ limit: 50 });

export const listAvailableProxies = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v) => browseInput.parse(v))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let q = supabaseAdmin
      .from("proxies")
      .select("id, ip, port, proxy_type, country, region, city, host, speed_mbps, blacklist")
      .eq("status", "available")
      .limit(data.limit);
    if (data.country) q = q.eq("country", data.country);
    if (data.proxyType) q = q.eq("proxy_type", data.proxyType);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return (rows ?? []).map((p) => ({
      id: p.id,
      ip: String(p.ip),
      port: p.port,
      proxyType: p.proxy_type,
      country: p.country,
      region: p.region,
      city: p.city,
      host: p.host,
      speedMbps: p.speed_mbps,
      blacklist: p.blacklist,
    }));
  });

// ----- socks list (filtered catalog) -----
const socksListInput = z
  .object({
    authType: z.string().optional(),
    proxyType: z.string().optional(),
    country: z.string().optional(),
    region: z.string().optional(),
    city: z.string().optional(),
    blacklist: z.enum(["yes", "no"]).optional(),
    zipcode: z.string().optional(),
    host: z.string().optional(),
    page: z.number().int().min(1).default(1),
    pageSize: z.number().int().min(1).max(200).default(20),
  })
  .default({ page: 1, pageSize: 20 });

export const listSocks = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v) => socksListInput.parse(v))
  .handler(async ({ data }) => {
    const from = (data.page - 1) * data.pageSize;
    const to = from + data.pageSize - 1;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let q = supabaseAdmin
      .from("proxies")
      .select(
        "id, ip, port, proxy_type, auth_type, country, region, city, host, zipcode, speed_mbps, blacklist, last_seen_at, last_view_at",
        { count: "exact" },
      )
      .order("last_seen_at", { ascending: false, nullsFirst: false })
      .range(from, to);
    if (data.authType) q = q.eq("auth_type", data.authType);
    if (data.proxyType) q = q.eq("proxy_type", data.proxyType);
    if (data.country) q = q.eq("country", data.country);
    if (data.region) q = q.eq("region", data.region);
    if (data.city) q = q.eq("city", data.city);
    if (data.blacklist) q = q.eq("blacklist", data.blacklist === "yes");
    if (data.zipcode) {
      const zips = data.zipcode.split(",").map((s) => s.trim()).filter(Boolean);
      if (zips.length) q = q.in("zipcode", zips);
    }
    if (data.host) q = q.ilike("host", `%${data.host}%`);
    const { data: rows, error, count } = await q;
    if (error) throw new Error(error.message);
    return {
      total: count ?? 0,
      rows: (rows ?? []).map((p: any) => ({
        id: p.id,
        ip: String(p.ip),
        port: p.port,
        proxyType: p.proxy_type,
        authType: p.auth_type,
        country: p.country,
        region: p.region,
        city: p.city,
        host: p.host,
        zipcode: p.zipcode,
        speedMbps: p.speed_mbps ? Number(p.speed_mbps) : null,
        blacklist: p.blacklist,
        lastSeenAt: p.last_seen_at,
        lastViewAt: p.last_view_at,
      })),
    };
  });

// ----- admin: bulk upload proxies (CSV) -----
const proxyRow = z.object({
  ip: z.string().min(1),
  port: z.coerce.number().int().min(1).max(65535),
  username: z.string().default(""),
  password: z.string().default(""),
  proxy_type: z.string().default("residential"),
  protocol: z.string().default("socks5"),
  auth_type: z.string().default("userpass"),
  country: z.string().optional().nullable(),
  region: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  zipcode: z.string().optional().nullable(),
  host: z.string().optional().nullable(),
  speed_mbps: z.coerce.number().optional().nullable(),
  blacklist: z
    .union([z.boolean(), z.string()])
    .transform((v) => (typeof v === "boolean" ? v : /^(true|yes|1)$/i.test(v)))
    .default(false),
  source: z.string().optional().nullable(),
  external_id: z.string().optional().nullable(),
});

export const bulkUploadProxies = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v) => z.object({ rows: z.array(z.record(z.any())).min(1).max(5000) }).parse(v))
  .handler(async ({ context, data }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");

    const errors: { row: number; error: string }[] = [];
    const parsed: any[] = [];
    data.rows.forEach((raw, i) => {
      const r = proxyRow.safeParse(raw);
      if (!r.success) {
        errors.push({ row: i + 1, error: r.error.issues[0]?.message ?? "invalid" });
      } else {
        parsed.push({ ...r.data, status: "available", last_seen_at: new Date().toISOString() });
      }
    });
    if (!parsed.length) return { inserted: 0, errors };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let inserted = 0;
    const chunkSize = 500;
    for (let i = 0; i < parsed.length; i += chunkSize) {
      const chunk = parsed.slice(i, i + chunkSize);
      const { error, count } = await supabaseAdmin
        .from("proxies")
        .upsert(chunk, { onConflict: "ip,port,username", count: "exact", ignoreDuplicates: false });
      if (error) {
        errors.push({ row: i, error: error.message });
      } else {
        inserted += count ?? chunk.length;
      }
    }
    return { inserted, errors };
  });

// ----- cart -----
export const getMyCart = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("cart_items")
      .select("id, price_cents, expires_at, proxy:proxies(id, ip, port, proxy_type, country)")
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    const items = (data ?? []).map((c: any) => ({
      id: c.id,
      priceCents: c.price_cents,
      expiresAt: c.expires_at,
      ip: String(c.proxy?.ip ?? ""),
      port: c.proxy?.port,
      proxyType: c.proxy?.proxy_type,
      country: c.proxy?.country,
    }));
    return {
      items,
      totalCents: items.reduce((s, i) => s + (i.priceCents ?? 0), 0),
      reservationMinutes: 15,
    };
  });

export const addToCart = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v) => z.object({ proxyId: z.string().uuid(), priceCents: z.number().int().min(0) }).parse(v))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from("cart_items").insert({
      user_id: context.userId,
      proxy_id: data.proxyId,
      price_cents: data.priceCents,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const removeFromCart = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v) => z.object({ id: z.string().uuid() }).parse(v))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase
      .from("cart_items")
      .delete()
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ----- subscriptions -----
export const listMySubscriptions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("subscriptions")
      .select("*, plan:plans(name, proxy_type, bandwidth_gb, max_proxies)")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

// ----- payments -----
export const listMyPayments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("payments")
      .select("*")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

// ----- usage -----
export const getUsageStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("usage_logs")
      .select("bytes_used, request_count, recorded_at")
      .eq("user_id", context.userId)
      .order("recorded_at", { ascending: false })
      .limit(30);
    const rows = data ?? [];
    const usedBandwidth = rows.reduce((s, r) => s + Number(r.bytes_used ?? 0), 0);
    const requests = rows.reduce((s, r) => s + (r.request_count ?? 0), 0);
    return {
      totalBandwidth: 0,
      usedBandwidth,
      requests,
      perDay: rows.map((r) => ({ date: r.recorded_at, bytes: Number(r.bytes_used ?? 0) })).reverse(),
    };
  });

// ----- referrals -----
export const listMyReferrals = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("referrals")
      .select("*")
      .eq("referrer_id", context.userId);
    return data ?? [];
  });