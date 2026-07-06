import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { runProvisioningWorker } from "@/lib/provisioning-worker";

/**
 * Payment Confirmation Webhook Handler
 * 
 * Processes payment confirmations and triggers order creation + provisioning
 */

// Schema for payment confirmation webhook
const paymentWebhookSchema = z.object({
  paymentId: z.string().uuid(),
  userId: z.string().uuid(),
  status: z.enum(["confirmed", "completed"]),
  amountCents: z.number().int().min(0),
  currency: z.string(),
  transactionHash: z.string().optional(),
});

/**
 * Public webhook endpoint for payment confirmations
 * Should be secured with webhook signing in production
 */
export const handlePaymentConfirmation = createServerFn({ method: "POST" })
  .inputValidator((v) => paymentWebhookSchema.parse(v))
  .handler(async ({ data }) => {
    const supabaseUrl = process.env.SUPABASE_URL!;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    const sb = createClient<Database>(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    try {
      // 1. Update payment status
      const { error: updateError } = await sb
        .from("payments")
        .update({
          status: "confirmed",
          confirmed_at: new Date().toISOString(),
          tx_hash: data.transactionHash,
        })
        .eq("id", data.paymentId)
        .eq("user_id", data.userId);

      if (updateError) {
        console.error("Error updating payment:", updateError);
        throw new Error(`Failed to update payment: ${updateError.message}`);
      }

      console.log(`[Payment:${data.paymentId}] Confirmed`);

      // 2. Update user balance
      const { data: profile, error: fetchError } = await sb
        .from("profiles")
        .select("balance_cents")
        .eq("id", data.userId)
        .single();

      if (!fetchError && profile) {
        const newBalance = (profile.balance_cents || 0) + data.amountCents;
        await sb
          .from("profiles")
          .update({ balance_cents: newBalance })
          .eq("id", data.userId);

        console.log(`[User:${data.userId}] Balance updated: +${data.amountCents} cents`);
      }

      // 3. Trigger provisioning worker to process any pending orders
      // In production, this could be:
      // - An async job queue (Bull, RabbitMQ)
      // - A separate worker service
      // - A scheduled cron job
      try {
        await runProvisioningWorker(`webhook-${data.paymentId}`);
        console.log(`[Payment:${data.paymentId}] Provisioning worker triggered`);
      } catch (workerError) {
        console.error("Provisioning worker error:", workerError);
        // Don't fail the webhook if provisioning fails
        // The order will be retried by the scheduled worker
      }

      return {
        success: true,
        message: "Payment confirmed and provisioning triggered",
        paymentId: data.paymentId,
      };
    } catch (error) {
      console.error("Webhook error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  });

/**
 * Webhook for checking payment status (optional)
 * Some payment providers need a status check endpoint
 */
export const checkPaymentStatus = createServerFn({ method: "GET" })
  .inputValidator((v) => z.object({ paymentId: z.string().uuid() }).parse(v))
  .handler(async ({ data }) => {
    const supabaseUrl = process.env.SUPABASE_URL!;
    const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY!;

    const sb = createClient<Database>(supabaseUrl, publishableKey, {
      auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    });

    const { data: payment, error } = await sb
      .from("payments")
      .select("id, status, amount_cents, created_at, confirmed_at")
      .eq("id", data.paymentId)
      .maybeSingle();

    if (error || !payment) {
      return { status: "not_found" };
    }

    return {
      status: payment.status,
      amountCents: payment.amount_cents,
      createdAt: payment.created_at,
      confirmedAt: payment.confirmed_at,
    };
  });
