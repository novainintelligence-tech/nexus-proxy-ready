import { createFileRoute } from "@tanstack/react-router";
import { createHash, createHmac, timingSafeEqual } from "crypto";

type TgPayload = {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
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

export const Route = createFileRoute("/api/public/auth/telegram")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const botToken = process.env.TELEGRAM_BOT_TOKEN;
        if (!botToken) {
          return Response.json({ error: "Telegram not configured" }, { status: 500 });
        }

        let payload: TgPayload;
        try {
          payload = await request.json();
        } catch {
          return Response.json({ error: "Invalid JSON" }, { status: 400 });
        }

        if (!payload?.id || !payload?.hash || !payload?.auth_date) {
          return Response.json({ error: "Missing fields" }, { status: 400 });
        }

        // Reject stale signatures (>15 min)
        const age = Math.floor(Date.now() / 1000) - Number(payload.auth_date);
        if (age > 900 || age < -60) {
          return Response.json({ error: "Auth data expired" }, { status: 401 });
        }

        if (!verifyTelegram(payload as any, botToken)) {
          return Response.json({ error: "Invalid signature" }, { status: 401 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const tgId = Number(payload.id);
        const displayName =
          [payload.first_name, payload.last_name].filter(Boolean).join(" ") ||
          payload.username ||
          `tg_${tgId}`;
        const email = `tg_${tgId}@telegram.nexusproxy.local`;

        // Find existing profile by telegram_id
        const { data: existing } = await supabaseAdmin
          .from("profiles")
          .select("id, email")
          .eq("telegram_id", tgId)
          .maybeSingle();

        let userEmail: string;
        if (existing?.email) {
          userEmail = existing.email;
        } else {
          // Create the auth user (idempotent on email)
          const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
            email,
            email_confirm: true,
            user_metadata: {
              display_name: displayName,
              telegram_id: tgId,
              telegram_username: payload.username ?? null,
              avatar_url: payload.photo_url ?? null,
              provider: "telegram",
            },
          });
          if (createErr && !/already/i.test(createErr.message)) {
            return Response.json({ error: createErr.message }, { status: 500 });
          }
          userEmail = email;

          // Link telegram_id on profile (trigger created it on signup)
          const userId = created?.user?.id;
          if (userId) {
            await supabaseAdmin
              .from("profiles")
              .update({ telegram_id: tgId, display_name: displayName })
              .eq("id", userId);
          } else {
            // user already existed under same email — link by email
            await supabaseAdmin
              .from("profiles")
              .update({ telegram_id: tgId })
              .eq("email", email);
          }
        }

        // Mint a one-shot magic link the client can verify to set a session
        const { data: linkData, error: linkErr } = await supabaseAdmin.auth.admin.generateLink({
          type: "magiclink",
          email: userEmail,
        });
        if (linkErr || !linkData?.properties?.hashed_token) {
          return Response.json(
            { error: linkErr?.message ?? "Could not mint session" },
            { status: 500 },
          );
        }

        return Response.json({
          token_hash: linkData.properties.hashed_token,
          email: userEmail,
          type: "magiclink",
        });
      },
    },
  },
});