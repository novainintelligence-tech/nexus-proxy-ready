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
  .handler(async ({ context, data }) => {
    let q = context.supabase
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