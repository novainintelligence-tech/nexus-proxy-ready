import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { randomUUID } from "crypto";

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

    // ----- create payment / checkout -----
    const createPaymentInput = z.object({
      planId: z.string().uuid().optional(),
      currency: z.string().default("BTC"),
    });

    export const createPayment = createServerFn({ method: "POST" })
      .middleware([requireSupabaseAuth])
      .inputValidator((v) => createPaymentInput.parse(v))
      .handler(async ({ context, data }) => {
        const { supabase, userId } = context;

        // Resolve plan price
        let priceCents = 0;
        let planRecord: any = null;
        if (data.planId) {
          const { data: p, error } = await supabase.from("plans").select("id, name, priceUsd").eq("id", data.planId).maybeSingle();
          if (error || !p) throw new Error("Plan not found");
          planRecord = p;
          priceCents = p.priceUsd ?? 0;
        } else {
          // For cart purchases, calculate total from cart items
          const { data: cart, error } = await supabase.from("cart_items").select("price_cents").eq("user_id", userId);
          if (error) throw new Error("Failed to read cart");
          priceCents = (cart ?? []).reduce((s: number, r: any) => s + (r.price_cents || 0), 0);
        }

        // Create payment row
        const id = randomUUID();
        const insert = {
          id,
          user_id: userId,
          plan_id: data.planId ?? null,
          amount_cents: priceCents,
          amount_usd: Math.round(priceCents),
          currency: data.currency,
          status: "pending",
          created_at: new Date().toISOString(),
        } as any;

        const { error: insertError } = await supabase.from("payments").insert(insert);
        if (insertError) throw new Error(insertError.message);

        // If BTCPAY is configured and currency is crypto, try to create an invoice
        const btcpayUrl = process.env.BTCPAY_URL;
        const btcpayKey = process.env.BTCPAY_API_KEY;
        let checkoutUrl: string | null = null;

        if (btcpayUrl && btcpayKey && /BTC|USDT|USDC/i.test(data.currency)) {
          try {
            const price = (priceCents / 100).toFixed(2);
            const res = await fetch(`${btcpayUrl.replace(/\/$/, "")}/invoices`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `token ${btcpayKey}`,
              },
              body: JSON.stringify({
                price,
                currency: "USD",
                metadata: { paymentId: id, userId },
                checkout: { speedPolicy: "HighSpeed" },
              }),
            });

            if (res.ok) {
              const body = await res.json();
              checkoutUrl = body?.checkoutLink || body?.url || null;
              // store invoice id & url
              await supabase.from("payments").update({ invoice_id: body?.id ?? null, checkout_url: checkoutUrl }).eq("id", id);
            } else {
              const t = await res.text();
              console.warn("BTCPay invoice creation failed:", res.status, t);
            }
          } catch (e) {
            console.error("BTCPay error:", e);
          }
        }

        return {
          id,
          plan: planRecord,
          amountCents: priceCents,
          currency: data.currency,
          checkoutUrl,
        };
      });

    // ----- submit transaction hash (user verifies) -----
    const submitHashInput = z.object({ id: z.string().uuid(), data: z.object({ txHash: z.string().min(6) }) });
    export const submitPaymentHash = createServerFn({ method: "POST" })
      .middleware([requireSupabaseAuth])
      .inputValidator((v) => submitHashInput.parse(v))
      .handler(async ({ context, data }) => {
        const { supabase, userId } = context;
        const { id, data: body } = data;

        const { data: payment, error } = await supabase.from("payments").select("id, user_id, status").eq("id", id).maybeSingle();
        if (error || !payment) throw new Error("Payment not found");
        if (payment.user_id !== userId) throw new Error("Forbidden");

        const { error: updateError } = await supabase.from("payments").update({ tx_hash: body.txHash, status: "pending_verification" }).eq("id", id);
        if (updateError) throw new Error(updateError.message);

        return { ok: true };
      });

    // ----- admin: sync plans (upsert list of plans) -----
    const syncPlansInput = z.object({ plans: z.array(z.any()).min(1) });
    export const adminSyncPlans = createServerFn({ method: "POST" })
      .middleware([requireSupabaseAuth])
      .inputValidator((v) => syncPlansInput.parse(v))
      .handler(async ({ context, data }) => {
        const { supabase, userId } = context;
        const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
        if (!isAdmin) throw new Error("Forbidden");

        const plans = data.plans.map((p: any) => ({
          id: p.id,
          name: p.name,
          description: p.description,
          priceUsd: Math.round((p.priceUsd ?? 0)),
          durationDays: p.durationDays ?? 30,
          proxyCount: p.proxyCount ?? 0,
          bandwidthGb: p.bandwidthGb ?? 0,
          features: p.features ?? [],
          isActive: true,
        }));

        const { error } = await supabase.from("plans").upsert(plans, { onConflict: ["id"] });
        if (error) throw new Error(error.message);
        return { ok: true, count: plans.length };
      });
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

// ============ ORDER PROVISIONING WORKFLOW ============

// ----- Create order after payment -----
const createOrderInput = z.object({
  paymentId: z.string().uuid(),
  planId: z.string().uuid(),
  country: z.string().optional(),
  proxyType: z.string().default("residential"),
  authType: z.string().default("userpass"),
});

export const createOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v) => createOrderInput.parse(v))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    
    // Verify payment exists and belongs to user
    const { data: payment, error: paymentError } = await supabase
      .from("payments")
      .select("id, status")
      .eq("id", data.paymentId)
      .eq("user_id", userId)
      .maybeSingle();
    
    if (paymentError || !payment) {
      throw new Error("Payment not found");
    }
    
    // Only proceed if payment is confirmed
    if (payment.status !== "confirmed") {
      throw new Error("Payment not confirmed yet");
    }
    
    // Verify plan exists
    const { data: plan, error: planError } = await supabase
      .from("plans")
      .select("id")
      .eq("id", data.planId)
      .maybeSingle();
    
    if (planError || !plan) {
      throw new Error("Plan not found");
    }
    
    // Create order with status=pending
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        user_id: userId,
        payment_id: data.paymentId,
        plan_id: data.planId,
        country: data.country,
        proxy_type: data.proxyType,
        auth_type: data.authType,
        status: "pending",
      })
      .select()
      .single();
    
    if (orderError || !order) {
      throw new Error(`Failed to create order: ${orderError?.message}`);
    }
    
    return {
      orderId: order.id,
      status: order.status,
      createdAt: order.created_at,
    };
  });

// ----- List my orders -----
export const listMyOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("orders")
      .select("*, plan:plans(name, price_cents), assignment:proxy_assignments(proxy:proxies(ip, port, proxy_type, country))")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false });
    
    if (error) throw new Error(error.message);
    
    return (data ?? []).map((order: any) => ({
      id: order.id,
      planName: order.plan?.name,
      status: order.status,
      country: order.country,
      proxyType: order.proxy_type,
      authType: order.auth_type,
      proxy: order.assignment?.[0]?.proxy ? {
        ip: String(order.assignment[0].proxy.ip),
        port: order.assignment[0].proxy.port,
        type: order.assignment[0].proxy.proxy_type,
      } : null,
      provisionedAt: order.provisioned_at,
      deliveredAt: order.delivered_at,
      expiresAt: order.expires_at,
      createdAt: order.created_at,
    }));
  });

// ----- Get order details -----
export const getOrderDetails = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v) => z.object({ orderId: z.string().uuid() }).parse(v))
  .handler(async ({ context, data }) => {
    const { data: order, error } = await context.supabase
      .from("orders")
      .select(`
        *,
        plan:plans(*),
        assignment:proxy_assignments(
          *,
          proxy:proxies(ip, port, username, password, proxy_type, country, region, city)
        )
      `)
      .eq("id", data.orderId)
      .eq("user_id", context.userId)
      .maybeSingle();
    
    if (error || !order) throw new Error("Order not found");
    
    const assignment = (order as any).assignment?.[0];
    return {
      id: order.id,
      status: order.status,
      plan: (order as any).plan,
      proxy: assignment?.proxy ? {
        ip: String(assignment.proxy.ip),
        port: assignment.proxy.port,
        username: assignment.proxy.username,
        password: assignment.proxy.password,
        type: assignment.proxy.proxy_type,
        country: assignment.proxy.country,
        region: assignment.proxy.region,
        city: assignment.proxy.city,
      } : null,
      provisioningAttempts: order.provisioning_attempts,
      failedReason: order.failed_reason,
      createdAt: order.created_at,
      expiresAt: order.expires_at,
    };
  });

// ----- Admin: Trigger manual provisioning -----
export const triggerProvisioning = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v) => z.object({ orderId: z.string().uuid() }).parse(v))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    
    // Verify user is admin
    const { data: isAdmin } = await supabase.rpc("has_role", {
      _user_id: userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");
    
    // Verify order exists
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("*")
      .eq("id", data.orderId)
      .maybeSingle();
    
    if (orderError || !order) throw new Error("Order not found");
    
    // Update status to provisioning
    const { data: updated, error: updateError } = await supabase
      .from("orders")
      .update({
        status: "provisioning",
        provisioning_attempts: (order.provisioning_attempts || 0) + 1,
      })
      .eq("id", data.orderId)
      .select()
      .single();
    
    if (updateError) throw new Error(updateError.message);
    
    // Log the provisioning attempt
    await supabase.from("provisioning_logs").insert({
      order_id: data.orderId,
      status: "pending",
      attempt_number: updated.provisioning_attempts,
      worker_id: "manual",
    });
    
    return { status: updated.status };
  });

// ----- Get available proxy count for filters -----
export const getProxyAvailability = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v) => z.object({
    country: z.string().optional(),
    proxyType: z.string().optional(),
    authType: z.string().optional(),
  }).parse(v))
  .handler(async ({ context, data }) => {
    const { supabase } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    
    const { data: count, error } = await supabaseAdmin
      .rpc("count_available_proxies", {
        p_country: data.country || null,
        p_proxy_type: data.proxyType || null,
        p_auth_type: data.authType || null,
      });
    
    if (error) throw new Error(error.message);
    return { available: count ?? 0 };
  });