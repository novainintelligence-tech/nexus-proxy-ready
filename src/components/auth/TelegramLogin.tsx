import { useEffect, useRef, useState } from "react";
import { createServerFn } from "@tanstack/react-start";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const getTelegramBotUsername = createServerFn({ method: "GET" }).handler(async () => {
  return { username: process.env.TELEGRAM_BOT_USERNAME ?? null };
});

declare global {
  interface Window {
    onTelegramAuth?: (user: any) => void;
  }
}

export function TelegramLogin({ onSuccess }: { onSuccess?: () => void }) {
  const fetchUsername = useServerFn(getTelegramBotUsername);
  const [username, setUsername] = useState<string | null>(null);
  const mountRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetchUsername().then((r) => setUsername(r.username));
  }, [fetchUsername]);

  useEffect(() => {
    window.onTelegramAuth = async (user) => {
      setBusy(true);
      try {
        const res = await fetch("/api/public/auth/telegram", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(user),
        });
        const body = await res.json();
        if (!res.ok) throw new Error(body?.error ?? "Telegram login failed");
        const { error } = await supabase.auth.verifyOtp({
          type: "magiclink",
          token_hash: body.token_hash,
        });
        if (error) throw error;
        toast.success("Signed in with Telegram");
        onSuccess?.();
      } catch (e: any) {
        toast.error(e?.message ?? "Telegram login failed");
      } finally {
        setBusy(false);
      }
    };
    return () => {
      window.onTelegramAuth = undefined;
    };
  }, [onSuccess]);

  useEffect(() => {
    if (!username || !mountRef.current) return;
    mountRef.current.innerHTML = "";
    const s = document.createElement("script");
    s.src = "https://telegram.org/js/telegram-widget.js?22";
    s.async = true;
    s.setAttribute("data-telegram-login", username);
    s.setAttribute("data-size", "large");
    s.setAttribute("data-radius", "8");
    s.setAttribute("data-request-access", "write");
    s.setAttribute("data-onauth", "onTelegramAuth(user)");
    mountRef.current.appendChild(s);
  }, [username]);

  if (!username) {
    return (
      <div className="text-xs text-muted-foreground text-center">
        Telegram login unavailable
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <div ref={mountRef} />
      {busy && <div className="text-xs text-muted-foreground">Signing in...</div>}
    </div>
  );
}