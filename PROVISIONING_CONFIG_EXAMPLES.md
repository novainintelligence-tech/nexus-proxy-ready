/**
 * Configuration Examples for Proxy Provisioning Workflow
 * 
 * Use these examples to configure your specific setup
 */

// ============ 1. ENVIRONMENT VARIABLES ============

export const ENV_EXAMPLE = `
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_PUBLISHABLE_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...

# Payment Provider: NowPayments
NOWPAYMENTS_API_KEY=your_api_key
NOWPAYMENTS_WEBHOOK_SECRET=your_webhook_secret
NOWPAYMENTS_IPN_URL=https://your-domain.com/api/webhooks/nowpayments

# Payment Provider: BTCPay Server
BTCPAY_URL=https://btcpay.your-domain.com
BTCPAY_STORE_ID=your_store_id
BTCPAY_API_KEY=your_api_key
BTCPAY_WEBHOOK_SECRET=your_webhook_secret

# Payment Provider: Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Provisioning Worker
PROVISIONING_MAX_ATTEMPTS=3
PROVISIONING_TIMEOUT_MS=30000
PROVISIONING_BATCH_SIZE=10
PROVISIONING_ENABLED=true
BROWSER_AUTOMATION_ENABLED=false

# Logging
LOG_LEVEL=info
DEBUG=proxy-provisioning:*

# Proxy Provider Credentials
PROXY_PROVIDER_USERNAME=your_username
PROXY_PROVIDER_PASSWORD=your_password
PROXY_PROVIDER_API_KEY=your_api_key
`;

// ============ 2. PAYMENT PROVIDER INTEGRATIONS ============

/**
 * NowPayments Integration Example
 * https://nowpayments.io/
 */
export const NOWPAYMENTS_CONFIG = {
  webhook_schema: {
    payment_id: 'string',
    payment_status: 'string', // finished, confirming, confirmed, expired, failed
    pay_address: 'string',
    pay_amount: 'number',
    price_amount: 'number',
    price_currency: 'string',
    received_amount: 'number',
    received_currency: 'string',
    txid: 'string',
    token: 'string',
  },
  
  example_webhook: {
    payment_id: '6172935',
    payment_status: 'finished',
    pay_address: 'TN3W4H6v8FBFGf1fsFG4DgkQQgHmMnxMgX',
    price_amount: 100.00,
    price_currency: 'usd',
    pay_amount: 10.55,
    pay_currency: 'usdt',
    received_amount: 10.55,
    received_currency: 'usdt',
    txid: 'TXIDhere',
    token: 'your_iPN_secret_token',
  },
  
  // Implementation example in src/routes/api/webhooks.payment.ts
  handler_pseudo: `
    import { z } from 'zod';
    import { handlePaymentConfirmation } from './webhooks.payment';
    
    const nowpaymentsSchema = z.object({
      payment_id: z.string(),
      payment_status: z.enum(['finished', 'confirming', 'confirmed']),
      price_amount: z.number(),
      price_currency: z.string(),
      txid: z.string().optional(),
    });
    
    export async function handleNowPayments(data: unknown) {
      const validated = nowpaymentsSchema.parse(data);
      
      if (validated.payment_status !== 'confirmed') return;
      
      const amountCents = Math.round(validated.price_amount * 100);
      
      return handlePaymentConfirmation({
        paymentId: findPaymentByProviderId(validated.payment_id).id,
        userId: findPaymentByProviderId(validated.payment_id).user_id,
        status: 'confirmed',
        amountCents,
        transactionHash: validated.txid,
      });
    }
  `,
};

/**
 * BTCPay Server Integration Example
 * https://btcpayserver.org/
 */
export const BTCPAY_CONFIG = {
  webhook_schema: {
    deliveryId: 'string',
    webhookId: 'string',
    originalDeliveryId: 'string',
    timestamp: 'number',
    type: 'string', // InvoiceExpired, InvoiceReceivedPayment, InvoiceProcessing, etc.
    data: {
      id: 'string',
      storeId: 'string',
      orderId: 'string', // Your order ID here
      invoiceTime: 'number',
      expirationTime: 'number',
      amount: 'number',
      currency: 'string',
      status: 'string',
    },
  },

  example_webhook: {
    deliveryId: 'delivery-id',
    webhookId: 'webhook-id',
    type: 'InvoiceProcessing',
    data: {
      id: 'invoice-id',
      storeId: 'store-id',
      orderId: 'your-order-id',
      amount: 100.00,
      currency: 'USD',
      status: 'Processing',
    },
  },

  setup_instructions: `
    1. Go to BTCPay Server → Stores → Your Store → Webhooks
    2. Add new webhook
    3. Payload URL: https://your-domain.com/api/webhooks/btcpay
    4. Events: InvoiceProcessing, InvoiceReceivedPayment
    5. Secret: Generate and save for verification
    6. Test delivery to verify setup
  `,
};

/**
 * Stripe Integration Example
 * https://stripe.com/
 */
export const STRIPE_CONFIG = {
  webhook_schema: {
    type: 'string', // payment_intent.succeeded, charge.completed, etc.
    data: {
      object: {
        id: 'string',
        object: 'string',
        amount: 'number', // in cents
        currency: 'string',
        customer: 'string',
        status: 'string',
        charges: {
          data: [
            {
              id: 'string',
              receipt_url: 'string',
            },
          ],
        },
      },
    },
    request: {
      id: 'string',
      idempotency_key: 'string',
    },
  },

  example_webhook: {
    type: 'charge.succeeded',
    data: {
      object: {
        id: 'ch_1234567890',
        object: 'charge',
        amount: 10000, // $100.00
        currency: 'usd',
        customer: 'cus_1234567890',
        status: 'succeeded',
      },
    },
  },
};

// ============ 3. PROVISIONING WORKER CONFIGURATION ============

export const WORKER_CONFIG_EXAMPLE = `
// src/lib/provisioning-worker.config.ts
import { ProxyProvisioningWorker } from './provisioning-worker';

// Development configuration
export const devConfig = {
  maxAttemptsPerOrder: 1, // Fail fast in dev
  timeoutMs: 10000,
  browserAutomationEnabled: false,
  providerName: 'test_provider',
};

// Production configuration
export const prodConfig = {
  maxAttemptsPerOrder: 3,
  timeoutMs: 30000,
  browserAutomationEnabled: true, // Enable in production
  providerName: process.env.PROXY_PROVIDER_NAME || 'default',
};

// Initialize worker
export const createWorker = () => {
  const config = process.env.NODE_ENV === 'production' ? prodConfig : devConfig;
  return new ProxyProvisioningWorker(config);
};
`;

// ============ 4. DATABASE SEEDING ============

export const SEED_DATABASE_SQL = `
-- Seed plans
INSERT INTO public.plans (name, description, price_cents, duration_days, bandwidth_gb, max_proxies, proxy_type, sort_order)
VALUES
  ('Test Plan', 'Test proxy for 1 day', 100, 1, 1, 1, 'residential', 1),
  ('15 Day Plan', 'Professional plan', 3000, 15, 10, 3, 'residential', 2),
  ('30 Day Plan', 'Advanced plan', 5000, 30, 20, 5, 'residential', 3),
  ('Starter Credits', 'Credit-based purchases', 1000, NULL, NULL, 10, 'residential', 10),
  ('Premium Credits', 'Bulk credit purchase', 5000, NULL, NULL, 50, 'residential', 11);

-- Seed sample proxies
INSERT INTO public.proxies (ip, port, username, password, proxy_type, country, region, city, status)
VALUES
  ('1.2.3.4'::inet, 8080, 'user1', 'pass1', 'residential', 'US', 'California', 'Los Angeles', 'available'),
  ('1.2.3.5'::inet, 8080, 'user2', 'pass2', 'residential', 'US', 'New York', 'New York', 'available'),
  ('1.2.3.6'::inet, 8080, 'user3', 'pass3', 'residential', 'US', 'Texas', 'Houston', 'available'),
  ('1.2.3.7'::inet, 8080, 'user4', 'pass4', 'residential', 'GB', 'England', 'London', 'available'),
  ('1.2.3.8'::inet, 8080, 'user5', 'pass5', 'residential', 'CA', 'Ontario', 'Toronto', 'available');
`;

// ============ 5. CRONJOB SETUP ============

export const CRON_SETUP_EXAMPLES = {
  // Vercel Crons
  vercel: {
    file: 'vercel.json',
    content: {
      crons: [
        {
          path: '/api/provisioning/run',
          schedule: '*/5 * * * *', // Every 5 minutes
        },
        {
          path: '/api/provisioning/cleanup',
          schedule: '0 * * * *', // Every hour
        },
      ],
    },
  },

  // Node-Cron setup
  nodeCron: `
    import cron from 'node-cron';
    import { runProvisioningWorker } from '@/lib/provisioning-worker';
    
    // Run provisioning every 5 minutes
    cron.schedule('*/5 * * * *', async () => {
      console.log('[CRON] Running provisioning worker...');
      try {
        await runProvisioningWorker('cron-scheduler');
      } catch (error) {
        console.error('[CRON] Provisioning error:', error);
        // Send alert/notification
      }
    });
    
    // Cleanup expired orders every hour
    cron.schedule('0 * * * *', async () => {
      console.log('[CRON] Running cleanup...');
      try {
        const worker = new ProxyProvisioningWorker();
        await worker.cleanupExpiredOrders('cron-cleanup');
      } catch (error) {
        console.error('[CRON] Cleanup error:', error);
      }
    });
  `,

  // External Service (EasyCron, etc.)
  easyCron: {
    setup: `
      1. Go to https://www.easycron.com/
      2. Create new cron job
      3. URL: https://your-domain.com/api/provisioning/run
      4. Frequency: Every 5 minutes
      5. HTTP Basic Auth: Add credentials if needed
      6. Save and test
    `,
  },
};

// ============ 6. PROVIDER CREDENTIALS SETUP ============

export const PROVIDER_SETUP_SQL = `
-- Store provider credentials (encrypted in production!)
INSERT INTO public.provider_credentials (provider_name, username, password, api_key, extra_config, is_active)
VALUES
  (
    'proxy_provider_1',
    'your_username',
    'your_password', -- MUST BE ENCRYPTED in production!
    'your_api_key',
    '{
      "dashboard_url": "https://provider1.com/dashboard",
      "filter_endpoint": "/api/proxies",
      "requires_browser_automation": false
    }'::jsonb,
    true
  ),
  (
    'proxy_provider_2',
    'your_username_2',
    'your_password_2',
    'your_api_key_2',
    '{
      "dashboard_url": "https://provider2.com",
      "requires_browser_automation": true,
      "browser_timeout_ms": 30000
    }'::jsonb,
    true
  );
`;

// ============ 7. MONITORING & ALERTS ============

export const MONITORING_QUERIES = {
  // Daily dashboard
  daily_stats: `
    SELECT
      DATE(created_at) as date,
      COUNT(*) as total_orders,
      COUNT(CASE WHEN status = 'provisioned' THEN 1 END) as provisioned,
      COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed,
      COUNT(CASE WHEN status = 'pending' OR status = 'provisioning' THEN 1 END) as in_progress,
      AVG(EXTRACT(EPOCH FROM (provisioned_at - created_at))) as avg_provision_time_sec
    FROM orders
    WHERE created_at > now() - interval '7 days'
    GROUP BY DATE(created_at)
    ORDER BY date DESC;
  `,

  // Failure analysis
  failure_analysis: `
    SELECT
      failed_reason,
      COUNT(*) as count,
      COUNT(DISTINCT user_id) as unique_users
    FROM orders
    WHERE status = 'failed'
      AND created_at > now() - interval '24 hours'
    GROUP BY failed_reason
    ORDER BY count DESC;
  `,

  // Slow provisioning
  slow_provisioning: `
    SELECT
      id,
      user_id,
      created_at,
      provisioned_at,
      EXTRACT(EPOCH FROM (provisioned_at - created_at)) as provision_time_sec,
      provisioning_attempts
    FROM orders
    WHERE status = 'provisioned'
      AND provisioned_at IS NOT NULL
      AND EXTRACT(EPOCH FROM (provisioned_at - created_at)) > 60
    ORDER BY provision_time_sec DESC
    LIMIT 20;
  `,

  // Worker logs analysis
  worker_performance: `
    SELECT
      DATE(created_at) as date,
      status,
      COUNT(*) as count,
      AVG(duration_ms) as avg_duration_ms,
      MAX(duration_ms) as max_duration_ms
    FROM provisioning_logs
    WHERE created_at > now() - interval '7 days'
    GROUP BY DATE(created_at), status
    ORDER BY date DESC, status;
  `,
};

// ============ 8. TESTING ============

export const TESTING_HELPERS = `
// test/provisioning.test.ts
import { ProxyProvisioningWorker } from '@/lib/provisioning-worker';
import { createClient } from '@supabase/supabase-js';

describe('Provisioning Workflow', () => {
  let worker: ProxyProvisioningWorker;
  let sb: any;

  beforeEach(() => {
    worker = new ProxyProvisioningWorker({
      maxAttemptsPerOrder: 3,
      timeoutMs: 5000,
    });
    sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  });

  // Test 1: Create and process order
  test('should create and provision order', async () => {
    // Create test user and payment
    const user = await createTestUser();
    const payment = await createTestPayment(user.id);
    
    // Create order
    const order = await sb.from('orders').insert({
      user_id: user.id,
      plan_id: PLAN_ID,
      payment_id: payment.id,
      status: 'pending',
    }).select().single();
    
    // Run provisioning
    await worker.processPendingOrders('test-worker');
    
    // Check result
    const result = await sb.from('orders').select().eq('id', order.id).single();
    expect(result.data.status).toBe('provisioned');
  });

  // Test 2: Handle no available proxies
  test('should fail gracefully when no proxies available', async () => {
    // Delete all proxies
    await sb.from('proxies').delete().eq('status', 'available');
    
    // Create order
    const order = await createTestOrder();
    
    // Run provisioning
    await worker.processPendingOrders('test-worker');
    
    // Check that order failed after retries
    const result = await sb.from('orders').select().eq('id', order.id).single();
    expect(result.data.status).toBe('failed');
  });

  // Test 3: Retry logic
  test('should retry failed orders', async () => {
    const order = await createTestOrder();
    
    // Run provisioning 3 times
    for (let i = 0; i < 3; i++) {
      await worker.processPendingOrders('test-worker');
    }
    
    // Check provisioning_attempts
    const result = await sb.from('orders').select().eq('id', order.id).single();
    expect(result.data.provisioning_attempts).toBe(3);
  });
});
`;
