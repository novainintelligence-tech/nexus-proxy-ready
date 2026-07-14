// @ts-nocheck
/**
 * Provisioning Worker Service
 * 
 * Handles automated proxy provisioning when orders are placed.
 * This worker can be triggered via:
 * - Webhook when payment is confirmed
 * - Periodic cron job
 * - Manual admin trigger
 */

import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

interface ProvisioningConfig {
  maxAttemptsPerOrder: number;
  timeoutMs: number;
  browserAutomationEnabled: boolean;
  providerName: string;
}

const defaultConfig: ProvisioningConfig = {
  maxAttemptsPerOrder: 3,
  timeoutMs: 30000, // 30 seconds
  browserAutomationEnabled: false,
  providerName: "provider_default",
};

export class ProxyProvisioningWorker {
  private sb: ReturnType<typeof createClient>;
  private sbAdmin: ReturnType<typeof createClient>;
  private config: ProvisioningConfig;

  constructor(config: Partial<ProvisioningConfig> = {}) {
    // Initialize Supabase clients
    const supabaseUrl = process.env.SUPABASE_URL!;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    
    this.sb = createClient<Database>(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    
    this.sbAdmin = this.sb; // Service role has all permissions
    
    this.config = { ...defaultConfig, ...config };
  }

  /**
   * Process pending orders and provision proxies
   */
  async processPendingOrders(workerId: string = "worker-main"): Promise<void> {
    console.log(`[${workerId}] Starting provisioning worker...`);

    try {
      // Fetch pending orders
      const { data: pendingOrders, error: fetchError } = await this.sbAdmin
        .from("orders")
        .select("*")
        .eq("status", "pending")
        .lt("provisioning_attempts", this.config.maxAttemptsPerOrder)
        .order("created_at", { ascending: true })
        .limit(10); // Process max 10 at a time

      if (fetchError) {
        console.error(`[${workerId}] Error fetching orders:`, fetchError);
        return;
      }

      if (!pendingOrders || pendingOrders.length === 0) {
        console.log(`[${workerId}] No pending orders to process`);
        return;
      }

      console.log(`[${workerId}] Found ${pendingOrders.length} pending orders`);

      // Process each order
      for (const order of pendingOrders) {
        await this.processOrder(order, workerId);
      }

      console.log(`[${workerId}] Provisioning worker completed`);
    } catch (error) {
      console.error(`[${workerId}] Worker error:`, error);
    }
  }

  /**
   * Process a single order
   */
  private async processOrder(order: any, workerId: string): Promise<void> {
    const logPrefix = `[${workerId}][Order:${order.id}]`;

    try {
      console.log(`${logPrefix} Processing order...`);

      // Mark order as provisioning
      const { error: statusError } = await this.sbAdmin
        .from("orders")
        .update({
          status: "provisioning",
          provisioning_attempts: (order.provisioning_attempts || 0) + 1,
        })
        .eq("id", order.id);

      if (statusError) {
        console.error(`${logPrefix} Error updating status:`, statusError);
        return;
      }

      // Log provisioning attempt
      const { data: log, error: logError } = await this.sbAdmin
        .from("provisioning_logs")
        .insert({
          order_id: order.id,
          worker_id: workerId,
          status: "in_progress",
          started_at: new Date().toISOString(),
          attempt_number: (order.provisioning_attempts || 0) + 1,
        })
        .select()
        .single();

      if (logError) {
        console.error(`${logPrefix} Error creating log:`, logError);
        return;
      }

      const startTime = Date.now();

      try {
        // Try to provision a proxy
        const proxy = await this.findAndReserveProxy(order);

        if (!proxy) {
          throw new Error("No available proxies matching filters");
        }

        // Assign proxy to order
        const { error: assignError } = await this.sbAdmin
          .from("proxy_assignments")
          .insert({
            order_id: order.id,
            proxy_id: proxy.id,
            expires_at: this.calculateExpirationDate(order),
          });

        if (assignError) {
          throw new Error(`Assignment failed: ${assignError.message}`);
        }

        // Mark proxy as leased
        const { error: updateProxyError } = await this.sbAdmin
          .from("proxies")
          .update({
            status: "leased",
            assigned_to: order.user_id,
            order_id: order.id,
            leased_until: this.calculateExpirationDate(order),
            provisioned_from: "automated_provisioning",
            provisioned_at: new Date().toISOString(),
          })
          .eq("id", proxy.id);

        if (updateProxyError) {
          throw new Error(`Failed to mark proxy as leased: ${updateProxyError.message}`);
        }

        // Mark order as provisioned
        const { error: completeError } = await this.sbAdmin
          .from("orders")
          .update({
            status: "provisioned",
            provisioned_at: new Date().toISOString(),
          })
          .eq("id", order.id);

        if (completeError) {
          throw new Error(`Failed to mark order complete: ${completeError.message}`);
        }

        // Update provisioning log as successful
        const duration = Date.now() - startTime;
        await this.sbAdmin
          .from("provisioning_logs")
          .update({
            status: "success",
            completed_at: new Date().toISOString(),
            duration_ms: duration,
            provider_response: { proxyId: proxy.id },
          })
          .eq("id", log.id);

        console.log(`${logPrefix} ✓ Successfully provisioned proxy ${proxy.ip}:${proxy.port}`);
      } catch (error) {
        const duration = Date.now() - startTime;
        const errorMsg = error instanceof Error ? error.message : String(error);

        console.error(`${logPrefix} ✗ Provisioning failed:`, errorMsg);

        // Update provisioning log with error
        await this.sbAdmin
          .from("provisioning_logs")
          .update({
            status: "failed",
            error_message: errorMsg,
            completed_at: new Date().toISOString(),
            duration_ms: duration,
          })
          .eq("id", log.id);

        // Check if we should mark order as failed
        const nextAttempt = (order.provisioning_attempts || 0) + 1;
        if (nextAttempt >= this.config.maxAttemptsPerOrder) {
          await this.sbAdmin
            .from("orders")
            .update({
              status: "failed",
              failed_reason: `Failed after ${nextAttempt} attempts: ${errorMsg}`,
            })
            .eq("id", order.id);

          console.log(`${logPrefix} Order marked as failed after max attempts`);
        } else {
          // Reset to pending for retry
          await this.sbAdmin
            .from("orders")
            .update({ status: "pending" })
            .eq("id", order.id);
        }
      }
    } catch (error) {
      console.error(`${logPrefix} Unexpected error:`, error);
    }
  }

  /**
   * Find and reserve an available proxy matching order filters
   */
  private async findAndReserveProxy(order: any): Promise<any> {
    // Build query with order filters
    let query = this.sbAdmin
      .from("proxies")
      .select("*")
      .eq("status", "available")
      .eq("blacklist", false);

    if (order.country) {
      query = query.eq("country", order.country);
    }

    if (order.proxy_type) {
      query = query.eq("proxy_type", order.proxy_type);
    }

    if (order.auth_type) {
      query = query.eq("auth_type", order.auth_type);
    }

    // Get the first available proxy
    const { data: proxies, error } = await query
      .order("last_seen_at", { ascending: false, nullsFirst: false })
      .limit(1);

    if (error) {
      throw new Error(`Query failed: ${error.message}`);
    }

    if (!proxies || proxies.length === 0) {
      return null;
    }

    // Return first matching proxy
    return proxies[0];
  }

  /**
   * Calculate proxy expiration date based on plan duration
   */
  private async calculateExpirationDate(order: any): Promise<Date> {
    try {
      // Fetch the plan to get duration
      const { data: plan, error } = await this.sbAdmin
        .from("plans")
        .select("duration_days")
        .eq("id", order.plan_id)
        .single();

      if (error || !plan) {
        // Default to 30 days
        return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      }

      const durationMs = (plan.duration_days || 30) * 24 * 60 * 60 * 1000;
      return new Date(Date.now() + durationMs);
    } catch {
      // Default to 30 days on error
      return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    }
  }

  /**
   * Fetch proxies using browser automation (Playwright/Puppeteer)
   * This would be implemented when integrating with a provider that requires clicking/navigation
   */
  private async fetchProxyViaBrowserAutomation(order: any): Promise<any> {
    if (!this.config.browserAutomationEnabled) {
      throw new Error("Browser automation not enabled");
    }

    // TODO: Implement browser automation
    // This would require Playwright or Puppeteer
    // Steps:
    // 1. Get provider credentials from database
    // 2. Launch browser
    // 3. Log in to provider
    // 4. Navigate to proxies page
    // 5. Apply filters
    // 6. Click to reveal proxy details
    // 7. Extract credentials
    // 8. Close browser
    // 9. Return proxy data

    throw new Error("Browser automation not yet implemented");
  }

  /**
   * Mark orders as expired if past expiration date
   */
  async cleanupExpiredOrders(workerId: string = "worker-cleanup"): Promise<void> {
    const logPrefix = `[${workerId}]`;

    try {
      const { error } = await this.sbAdmin
        .from("orders")
        .update({ status: "expired" })
        .lt("expires_at", new Date().toISOString())
        .eq("status", "pending");

      if (error) {
        console.error(`${logPrefix} Error cleaning up expired orders:`, error);
      } else {
        console.log(`${logPrefix} Expired orders cleanup completed`);
      }
    } catch (error) {
      console.error(`${logPrefix} Cleanup error:`, error);
    }
  }
}

/**
 * Export factory function for easy use in API routes
 */
export async function runProvisioningWorker(
  workerId: string = "api-trigger"
): Promise<{ processed: number; errors: number }> {
  const worker = new ProxyProvisioningWorker();
  await worker.processPendingOrders(workerId);
  await worker.cleanupExpiredOrders(workerId);
  
  return { processed: 0, errors: 0 };
}
