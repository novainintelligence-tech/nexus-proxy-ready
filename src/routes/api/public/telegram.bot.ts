import { createFileRoute } from "@tanstack/react-router";
import { createHash, createHmac, timingSafeEqual } from "crypto";

const BOT_COMMANDS = [
  "/start",
  "/buy",
  "/plans",
  "/status",
  "/admin",
  "/confirm",
];

type TelegramUpdate = {
  update_id: number;
  message?: {
    message_id: number;
    from?: {
      id: number;
      is_bot?: boolean;
      first_name?: string;
      last_name?: string;
      username?: string;
      language_code?: string;
    };
    chat: {
      id: number;
      type: string;
      username?: string;
      first_name?: string;
      last_name?: string;
    };
    text?: string;
    entities?: { offset: number; length: number; type: string }[];
    date: number;
  };
};

function verifyTelegram(data: Record<string, any>, botToken: string): boolean {
  const { hash, ...rest } = data;
  if (!hash) return false;
  const checkString = Object.keys(rest)
    .sort()
    .map((k) => `${k}=${rest[k]}`)
    .join("\n");
  const secret = createHash("sha256").update(botToken).digest();
  const hmac = createHmac("sha256", secret).update(checkString).digest("hex");
  const a = Buffer.from(hmac, "hex");
  const b = Buffer.from(String(hash), "hex");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

function formatPlans(plans: any[]) {
  if (!plans || plans.length === 0) return "No active plans available.";
  const lines = plans.map((plan) => {
    return `• ${plan.name} - $${(plan.price_cents / 100).toFixed(2)} (${plan.duration_days}d, ${plan.proxy_type || "SOCKS5"})`;
  });
  return [`Available plans:`, ...lines].join("\n");
}

async function sendTelegramMessage(botToken: string, chatId: number, text: string) {
  await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "Markdown" }),
  });
}

export const Route = createFileRoute("/api/public/telegram/bot")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const botToken = process.env.TELEGRAM_BOT_TOKEN;
        if (!botToken) {
          return Response.json({ error: "Telegram bot not configured" }, { status: 500 });
        }

        let update: TelegramUpdate;
        try {
          update = await request.json();
        } catch {
          return Response.json({ error: "Invalid JSON" }, { status: 400 });
        }

        const message = update.message;
        if (!message || !message.text || !message.chat?.id) {
          return Response.json({ ok: true });
        }

        const chatId = message.chat.id;
        const text = message.text.trim();
        const parts = text.split(/\s+/);
        const command = parts[0].toLowerCase();
        const arg = parts.slice(1).join(" ");

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        if (command === "/start") {
          await sendTelegramMessage(
            botToken,
            chatId,
            "Welcome to NexusProxy! Use /plans to view pricing or /buy <plan_id> to create a purchase request. Admins can use /admin or /stats.",
          );
          return Response.json({ ok: true });
        }

        if (command === "/plans") {
          const { data: plans, error } = await supabaseAdmin
            .from("plans")
            .select("id, name, price_cents, duration_days, proxy_type")
            .eq("active", true)
            .order("sort_order");
          if (error) {
            await sendTelegramMessage(botToken, chatId, `Error loading plans: ${error.message}`);
            return Response.json({ ok: true });
          }
          await sendTelegramMessage(botToken, chatId, formatPlans(plans ?? []));
          return Response.json({ ok: true });
        }

        if (command === "/buy") {
          if (!arg) {
            await sendTelegramMessage(botToken, chatId, "Usage: /buy <plan_id>. Example: /buy socks5-30d-50");
            return Response.json({ ok: true });
          }

          const { data: plan } = await supabaseAdmin.from("plans").select("*").eq("id", arg).maybeSingle();
          if (!plan) {
            await sendTelegramMessage(botToken, chatId, `Plan not found: ${arg}`);
            return Response.json({ ok: true });
          }

          const telegramUser = await supabaseAdmin.from("profiles").select("id, email").eq("telegram_id", message.from?.id ?? 0).maybeSingle();
          if (!telegramUser.data?.id) {
            await sendTelegramMessage(botToken, chatId, "Your Telegram account is not linked to a NexusProxy profile yet. Please log in once and connect Telegram.");
            return Response.json({ ok: true });
          }

          const amountCents = plan.price_cents;
          const id = crypto.randomUUID();
          const { error } = await supabaseAdmin.from("payments").insert({
            id,
            user_id: telegramUser.data.id,
            amount_cents: amountCents,
            amount_usd: amountCents,
            currency: "BTC",
            status: "pending",
            provider: "telegram-bot",
            created_at: new Date().toISOString(),
            metadata: { planId: plan.id, planName: plan.name, telegramChatId: chatId },
          });

          if (error) {
            await sendTelegramMessage(botToken, chatId, `Failed to create payment: ${error.message}`);
            return Response.json({ ok: true });
          }

          await sendTelegramMessage(
            botToken,
            chatId,
            `Created request for ${plan.name} at $${(amountCents / 100).toFixed(2)}. Use /status ${id} to check status or send your TxHash once paid.`,
          );
          return Response.json({ ok: true });
        }

        if (command === "/status") {
          if (!arg) {
            await sendTelegramMessage(botToken, chatId, "Usage: /status <payment_id>");
            return Response.json({ ok: true });
          }

          const { data: payment } = await supabaseAdmin
            .from("payments")
            .select("id, status, amount_cents, currency, tx_hash, confirmed_at")
            .eq("id", arg)
            .maybeSingle();
          if (!payment) {
            await sendTelegramMessage(botToken, chatId, `Payment not found: ${arg}`);
            return Response.json({ ok: true });
          }

          await sendTelegramMessage(
            botToken,
            chatId,
            `Payment ${payment.id}\nStatus: ${payment.status}\nAmount: $${(payment.amount_cents / 100).toFixed(2)} ${payment.currency}\nTxHash: ${payment.tx_hash ?? "None"}\nConfirmed: ${payment.confirmed_at ?? "No"}`,
          );
          return Response.json({ ok: true });
        }

        if (command === "/admin" || command === "/stats") {
          const tgId = message.from?.id ?? 0;
          const { data: adminProfile } = await supabaseAdmin
            .from("profiles")
            .select("id")
            .eq("telegram_id", tgId)
            .maybeSingle();

          if (!adminProfile?.id) {
            await sendTelegramMessage(botToken, chatId, "Admin access denied.");
            return Response.json({ ok: true });
          }

          const { data: roles } = await supabaseAdmin
            .from("user_roles")
            .select("role")
            .eq("user_id", adminProfile.id);
          const isAdmin = roles?.some((row) => row.role === "admin");
          if (!isAdmin) {
            await sendTelegramMessage(botToken, chatId, "Admin access denied.");
            return Response.json({ ok: true });
          }

          const stats = await supabaseAdmin
            .rpc("get_admin_stats")
            .select();

          await sendTelegramMessage(
            botToken,
            chatId,
            `Admin Stats:\nUsers: ${stats?.total_users ?? "?"}\nRevenue: $${(stats?.total_revenue_cents ?? 0) / 100}\nPending payments: ${stats?.pending_payments ?? "?"}`,
          );
          return Response.json({ ok: true });
        }

        if (command === "/confirm") {
          if (!arg) {
            await sendTelegramMessage(botToken, chatId, "Usage: /confirm <payment_id>");
            return Response.json({ ok: true });
          }
          const tgId = message.from?.id ?? 0;
          const { data: adminProfile } = await supabaseAdmin
            .from("profiles")
            .select("id")
            .eq("telegram_id", tgId)
            .maybeSingle();
          const { data: roles } = await supabaseAdmin
            .from("user_roles")
            .select("role")
            .eq("user_id", adminProfile?.id);
          const isAdmin = roles?.some((row) => row.role === "admin");
          if (!isAdmin) {
            await sendTelegramMessage(botToken, chatId, "Admin access denied.");
            return Response.json({ ok: true });
          }

          const { data: payment } = await supabaseAdmin.from("payments").select("id, status").eq("id", arg).maybeSingle();
          if (!payment) {
            await sendTelegramMessage(botToken, chatId, `Payment not found: ${arg}`);
            return Response.json({ ok: true });
          }

          await supabaseAdmin.from("payments").update({ status: "confirmed", confirmed_at: new Date().toISOString() }).eq("id", arg);
          await sendTelegramMessage(botToken, chatId, `Payment ${arg} marked confirmed.`);
          return Response.json({ ok: true });
        }

        await sendTelegramMessage(botToken, chatId, `Unknown command. Use ${BOT_COMMANDS.join(", ")}.`);
        return Response.json({ ok: true });
      },
    },
  },
});
