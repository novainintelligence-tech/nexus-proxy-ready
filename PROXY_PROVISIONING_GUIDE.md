# Proxy Provisioning Workflow - Complete Implementation Guide

## Table of Contents
1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Database Schema](#database-schema)
4. [API Reference](#api-reference)
5. [Integration Guide](#integration-guide)
6. [Configuration](#configuration)
7. [Troubleshooting](#troubleshooting)

## Overview

This implementation provides a complete workflow for on-demand proxy provisioning:

```
Customer Purchase
      ↓
Payment Confirmed (webhook)
      ↓
Order Created
      ↓
Provisioning Worker Triggered
      ↓
Find Available Proxy
      ↓
Assign to Order + Mark as Sold
      ↓
Deliver to Customer
```

### Benefits

- **Automatic**: Proxies are provisioned immediately after payment confirmation
- **Filtered**: Customers can filter by country, type, auth method
- **Reliable**: Retry logic with comprehensive logging
- **Scalable**: Batch processing of multiple orders
- **Secure**: Row-level security ensures users only see their orders

## Architecture

### Three-Tier System

```
┌─────────────────────────────────────────────┐
│          Frontend (Lovable)                 │
│  - Plan selection                           │
│  - Proxy browsing & ordering                │
│  - Order status & credentials display       │
└──────────────┬──────────────────────────────┘
               │
┌──────────────v──────────────────────────────┐
│          Backend API (Tanstack Start)       │
│  - Order creation                           │
│  - Payment tracking                         │
│  - Webhook handlers                         │
│  - Order status queries                     │
└──────────────┬──────────────────────────────┘
               │
┌──────────────v──────────────────────────────┐
│      Provisioning Worker                    │
│  - Process pending orders                   │
│  - Find available proxies                   │
│  - Browser automation (optional)            │
│  - Update inventory                         │
│  - Comprehensive logging                    │
└─────────────────────────────────────────────┘
```

### Components

1. **Database (Supabase)**
   - Orders, proxy assignments, provisioning logs
   - Provider credentials vault
   - RLS policies for security

2. **API Functions**
   - Order creation/retrieval
   - Provisioning triggers
   - Status queries

3. **Provisioning Worker**
   - Async order processing
   - Proxy matching logic
   - Error handling & retries

4. **Webhooks**
   - Payment confirmation handling
   - Worker triggering

## Database Schema

### orders
```sql
id                      UUID (PK)
user_id                 UUID (FK → auth.users)
plan_id                 UUID (FK → plans)
payment_id              UUID (FK → payments)
country                 TEXT
proxy_type              TEXT
auth_type               TEXT
status                  TEXT ('pending', 'provisioning', 'provisioned', 'failed')
provisioning_attempts   INT
max_provisioning_attempts INT
provisioned_at          TIMESTAMPTZ
delivered_at            TIMESTAMPTZ
failed_reason           TEXT
created_at              TIMESTAMPTZ
expires_at              TIMESTAMPTZ
```

### proxy_assignments
```sql
id                      UUID (PK)
order_id                UUID (FK → orders)
proxy_id                UUID (FK → proxies)
assigned_at             TIMESTAMPTZ
expires_at              TIMESTAMPTZ
```

### provisioning_logs
```sql
id                      UUID (PK)
order_id                UUID (FK → orders)
worker_id               TEXT
attempt_number          INT
status                  TEXT ('pending', 'in_progress', 'success', 'failed')
provider_name           TEXT
provider_response       JSONB
error_message           TEXT
started_at              TIMESTAMPTZ
completed_at            TIMESTAMPTZ
duration_ms             INT
created_at              TIMESTAMPTZ
```

### provider_credentials
```sql
id                      UUID (PK)
provider_name           TEXT
username                TEXT
password                TEXT (encrypted in production)
api_key                 TEXT
api_secret              TEXT
extra_config            JSONB
is_active               BOOLEAN
created_at              TIMESTAMPTZ
updated_at              TIMESTAMPTZ
```

## API Reference

### Order Management

#### Create Order
```typescript
// After payment is confirmed
const { orderId, status } = await createOrder({
  paymentId: "uuid",
  planId: "uuid",
  country: "US", // optional
  proxyType: "residential", // default
  authType: "userpass", // default
});
```

**When to call:**
- After payment confirmation via webhook
- Automatically in `handlePaymentConfirmation()`

#### List My Orders
```typescript
const orders = await listMyOrders();
// Returns array of orders with assigned proxies
```

**Response:**
```typescript
{
  id: string;
  planName: string;
  status: "pending" | "provisioning" | "provisioned" | "failed";
  country?: string;
  proxyType: string;
  authType: string;
  proxy?: {
    ip: string;
    port: number;
    type: string;
  };
  provisionedAt?: string;
  deliveredAt?: string;
  expiresAt: string;
  createdAt: string;
}[]
```

#### Get Order Details
```typescript
const order = await getOrderDetails({ orderId: "uuid" });
```

**Response:**
```typescript
{
  id: string;
  status: string;
  plan: Plan;
  proxy?: {
    ip: string;
    port: number;
    username: string;
    password: string;
    type: string;
    country: string;
    region: string;
    city: string;
  };
  provisioningAttempts: number;
  failedReason?: string;
  createdAt: string;
  expiresAt: string;
}
```

#### Get Proxy Availability
```typescript
const { available } = await getProxyAvailability({
  country: "US",
  proxyType: "residential",
  authType: "userpass",
});
```

### Admin Functions

#### Trigger Manual Provisioning
```typescript
// Admin only
const { status } = await triggerProvisioning({ orderId: "uuid" });
```

## Integration Guide

### 1. Payment Provider Integration

Update the webhook handler to match your payment provider's schema:

```typescript
// In src/routes/api/webhooks.payment.ts
export const handlePaymentConfirmation = createServerFn({ method: "POST" })
  .inputValidator((v) => {
    // Adapt schema to your provider's webhook format
    if (isNowPayments(v)) return nowPaymentsSchema.parse(v);
    if (isBTCPay(v)) return btcpaySchema.parse(v);
    // ...
  })
  .handler(async ({ data }) => {
    // Existing logic handles the rest
  });
```

### 2. Scheduled Provisioning

Set up periodic provisioning using a cron service:

**Option A: Vercel Crons (if using Vercel)**
```json
{
  "crons": [{
    "path": "/api/provisioning/run",
    "schedule": "*/5 * * * *"
  }]
}
```

**Option B: External Service (EasyCron, Vercel, etc.)**
```bash
curl -X POST https://your-domain.com/api/provisioning/run
```

**Option C: Node-Cron**
```typescript
import cron from 'node-cron';
import { runProvisioningWorker } from '@/lib/provisioning-worker';

cron.schedule('*/5 * * * *', async () => {
  await runProvisioningWorker('scheduler');
});
```

### 3. Browser Automation (Optional)

For providers that require UI interaction:

```typescript
// Install Playwright
npm install playwright

// Update provisioning-worker.ts
import { chromium } from 'playwright';

async fetchProxyViaBrowserAutomation(order) {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  // Get provider credentials
  const creds = await this.getProviderCredentials(order.provider);
  
  // Log in
  await page.goto('https://provider.com/login');
  await page.fill('[name=username]', creds.username);
  await page.fill('[name=password]', creds.password);
  await page.click('[type=submit]');
  
  // Apply filters
  await page.selectOption('[name=country]', order.country);
  await page.selectOption('[name=type]', order.proxy_type);
  
  // Click proxy and read credentials
  const proxyRow = await page.locator('table tbody tr').first();
  await proxyRow.click();
  
  const credentials = {
    ip: await page.textContent('.proxy-ip'),
    port: await page.textContent('.proxy-port'),
    username: await page.inputValue('[name=username]'),
    password: await page.inputValue('[name=password]'),
  };
  
  await browser.close();
  return credentials;
}
```

### 4. Proxy Provider Integration

**Example: NowPayments Integration**

```typescript
// src/lib/providers/nowpayments.ts
export const nowPaymentsWebhookSchema = z.object({
  payment_id: z.string(),
  payment_status: z.enum(['finished', 'confirming', 'confirmed']),
  pay_address: z.string(),
  price_amount: z.number(),
  price_currency: z.string(),
  received_amount: z.number(),
  received_currency: z.string(),
});

export async function handleNowPaymentsConfirmation(data: any) {
  if (data.payment_status !== 'confirmed') return;
  
  const payment = await findPaymentByProviderId(data.payment_id);
  await handlePaymentConfirmation({
    paymentId: payment.id,
    userId: payment.user_id,
    status: 'confirmed',
    amountCents: Math.round(data.price_amount * 100),
    transactionHash: data.txid,
  });
}
```

## Configuration

### Environment Variables
```bash
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_PUBLISHABLE_KEY=your-key
SUPABASE_SERVICE_ROLE_KEY=your-key

# Provisioning Worker
PROVISIONING_MAX_ATTEMPTS=3
PROVISIONING_TIMEOUT_MS=30000
PROVISIONING_BATCH_SIZE=10
BROWSER_AUTOMATION_ENABLED=false
```

### Provisioning Configuration
```typescript
const config: ProvisioningConfig = {
  maxAttemptsPerOrder: 3,        // Max retry attempts
  timeoutMs: 30000,               // Worker timeout
  browserAutomationEnabled: false, // Enable for UI-based providers
  providerName: "provider_default",
};

const worker = new ProxyProvisioningWorker(config);
```

## Frontend Usage

### Buy Proxy Flow

```typescript
// pages/Plans.tsx
function PricingPage() {
  const { mutate: checkout } = useMutation({
    mutationFn: async (planId: string) => {
      // 1. Create payment
      const payment = await createPayment({
        planId,
        amountCents: plan.price_cents,
      });
      
      // 2. Redirect to payment provider
      window.location.href = payment.payment_url;
      // After user completes payment, provider redirects back
      
      // 3. Create order (via webhook or manual trigger)
      const order = await createOrder({
        paymentId: payment.id,
        planId,
        country: filters.country,
        proxyType: filters.proxyType,
      });
      
      return order;
    },
  });
  
  return (
    <button onClick={() => checkout(plan.id)}>
      Buy {plan.name} for ${plan.price}
    </button>
  );
}
```

### View Order Status

```typescript
// pages/Dashboard.tsx
function Dashboard() {
  const { data: orders } = useQuery({
    queryKey: ['orders'],
    queryFn: () => listMyOrders(),
  });
  
  return (
    <div>
      {orders?.map(order => (
        <OrderCard key={order.id} order={order}>
          {order.status === 'provisioned' && order.proxy && (
            <ProxyCredentials
              ip={order.proxy.ip}
              port={order.proxy.port}
              username={order.proxy.username}
              password={order.proxy.password}
            />
          )}
          {order.status === 'provisioning' && (
            <Spinner>Fetching your proxy...</Spinner>
          )}
          {order.status === 'failed' && (
            <Alert>{order.failedReason}</Alert>
          )}
        </OrderCard>
      ))}
    </div>
  );
}
```

## Troubleshooting

### Order stuck in "provisioning"

**Symptoms:** Order status doesn't change after 1 hour

**Solutions:**
1. Check provisioning logs: `SELECT * FROM provisioning_logs WHERE order_id = ?`
2. Check proxy availability: `SELECT COUNT(*) FROM proxies WHERE status = 'available'`
3. Manually trigger: `await triggerProvisioning({ orderId })`
4. Check worker logs in server console

### No available proxies

**Symptoms:** Orders fail with "No available proxies"

**Solutions:**
1. Bulk upload proxies: Use admin CSV upload feature
2. Sync from provider: Implement sync worker
3. Check proxy status: `SELECT status, COUNT(*) FROM proxies GROUP BY status`

### Webhook not triggering provisioning

**Symptoms:** Payment confirmed but order not created

**Solutions:**
1. Verify webhook credentials in payment provider
2. Check server logs for webhook errors
3. Manually trigger: `curl -X POST /api/provisioning/run`
4. Test webhook: Use payment provider's webhook test feature

### High provisioning failure rate

**Symptoms:** Many orders with status "failed"

**Solutions:**
1. Check error messages: `SELECT error_message FROM provisioning_logs WHERE status = 'failed'`
2. Increase timeout: `PROVISIONING_TIMEOUT_MS=60000`
3. Increase max attempts: `maxAttemptsPerOrder: 5`
4. Check proxy data quality: Ensure proxy credentials are correct

## Monitoring & Alerts

### Key Metrics

```typescript
// Daily dashboard query
SELECT
  COUNT(*) as total_orders,
  COUNT(CASE WHEN status = 'provisioned' THEN 1 END) as provisioned,
  COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed,
  COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
  AVG(EXTRACT(EPOCH FROM (provisioned_at - created_at))) as avg_provision_time_sec
FROM orders
WHERE created_at > now() - interval '24 hours';
```

### Set Up Alerts

- Failed orders > 5% of total
- Average provisioning time > 60 seconds
- No orders processed in last 30 minutes
- Worker errors in logs

## Next Steps

1. ✅ Database schema implemented
2. ✅ API functions created
3. ✅ Provisioning worker built
4. ⏳ Integrate payment provider webhook
5. ⏳ Deploy provisioning worker
6. ⏳ Test end-to-end flow
7. ⏳ Set up monitoring
8. ⏳ Implement browser automation (if needed)
9. ⏳ Add email notifications for order status
10. ⏳ Create admin dashboard for monitoring
