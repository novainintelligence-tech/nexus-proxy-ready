# ✅ Getting Started Checklist

## 📖 Documentation (Read First)

- [ ] Read `IMPLEMENTATION_SUMMARY.md` - Overview of what's implemented
- [ ] Read `PROXY_PROVISIONING_GUIDE.md` - Complete integration guide  
- [ ] Review `PROVISIONING_CONFIG_EXAMPLES.md` - Your payment provider setup

## 🗄️ Database Setup

- [ ] Run Supabase migration
  ```bash
  supabase push
  ```
- [ ] Verify tables created
  ```bash
  # Check Supabase Dashboard → SQL Editor
  SELECT * FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name IN ('orders', 'proxy_assignments', 'provisioning_logs', 'provider_credentials');
  ```
- [ ] Seed sample data (optional)
  ```bash
  # Use SQL from PROVISIONING_CONFIG_EXAMPLES.md
  ```

## 🔌 Payment Provider Integration

Choose your payment provider and configure webhook:

### NowPayments
- [ ] Get API key from NowPayments dashboard
- [ ] Set webhook URL: `https://your-domain.com/api/webhooks/payment`
- [ ] Add `NOWPAYMENTS_API_KEY` to environment
- [ ] Test webhook using NowPayments test feature

### BTCPay Server
- [ ] Deploy BTCPay Server (self-hosted or use service)
- [ ] Create store and API key
- [ ] Add webhook: `https://your-domain.com/api/webhooks/payment`
- [ ] Add `BTCPAY_URL`, `BTCPAY_STORE_ID`, `BTCPAY_API_KEY` to environment

### Stripe
- [ ] Get live/test API keys
- [ ] Create webhook endpoint
- [ ] Add webhook: `https://your-domain.com/api/webhooks/payment`
- [ ] Add `STRIPE_SECRET_KEY` to environment

### Custom Provider
- [ ] Create adapter in `src/routes/api/webhooks.payment.ts`
- [ ] Map provider schema to expected format
- [ ] Test with provider's test webhook feature

## 🚀 Deployment

### Option A: Webhook-Triggered (Recommended for MVP)
- [ ] Deploy webhook handler to your server
- [ ] Test webhook with dummy payment
- [ ] Monitor logs for successful triggering

### Option B: Scheduled Worker (Every 5 minutes)
- [ ] Set up cron job via:
  - [ ] Vercel Crons (`vercel.json`)
  - [ ] EasyCron (external service)
  - [ ] node-cron (add to server startup)
- [ ] Test by creating pending order manually
- [ ] Verify worker processes it

### Option C: Job Queue (High Volume)
- [ ] Install job queue (Bull with Redis)
- [ ] Create worker process
- [ ] Deploy alongside main app
- [ ] Test with multiple concurrent orders

## 🧪 Testing

### Manual Test Flow
1. [ ] Create test user
2. [ ] Create test payment
   ```sql
   INSERT INTO payments (user_id, amount_cents, status) 
   VALUES ('user-id', 5000, 'pending');
   ```
3. [ ] Simulate payment confirmation webhook
4. [ ] Check if order was created
5. [ ] Verify provisioning worker ran
6. [ ] Check if proxy was assigned
7. [ ] Verify order status is "provisioned"

### Check Logs
```sql
-- View provisioning attempts
SELECT * FROM provisioning_logs 
WHERE order_id = 'your-order-id'
ORDER BY created_at DESC;

-- View order status
SELECT id, status, provisioning_attempts, failed_reason 
FROM orders 
WHERE id = 'your-order-id';

-- View proxy assignment
SELECT * FROM proxy_assignments 
WHERE order_id = 'your-order-id';
```

## 📱 Frontend Implementation

- [ ] Review example components in `src/components/proxy-provisioning/OrderFlow.example.tsx`
- [ ] Copy components to your pages directory
- [ ] Update imports to match your project
- [ ] Wire up to existing plan/checkout pages
- [ ] Test buy flow end-to-end

### Update Purchase Page
```typescript
// pages/Plans.tsx
import { PlansPurchase } from '@/components/proxy-provisioning/OrderFlow.example';

export default function PlansPage() {
  return <PlansPurchase onOrderCreated={(id) => navigate(`/orders/${id}`)} />;
}
```

### Add Dashboard Order View
```typescript
// pages/Dashboard.tsx
import { MyOrdersList } from '@/components/proxy-provisioning/OrderFlow.example';

export default function Dashboard() {
  return (
    <div>
      <h1>Dashboard</h1>
      <MyOrdersList />
    </div>
  );
}
```

## 🔐 Security Setup

- [ ] Enable webhook signature verification
  ```typescript
  // In webhooks.payment.ts
  function verifyWebhookSignature(body, signature) {
    const expected = crypto
      .createHmac('sha256', process.env.WEBHOOK_SECRET!)
      .update(body)
      .digest('hex');
    return signature === expected;
  }
  ```

- [ ] Add rate limiting
  ```typescript
  // npm install express-rate-limit
  import rateLimit from 'express-rate-limit';
  
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
  });
  
  app.post('/api/webhooks/payment', limiter, handlePaymentConfirmation);
  ```

- [ ] Encrypt provider credentials
  - Use Supabase Vault (docs link)
  - Or external secret management (HashiCorp Vault, AWS Secrets Manager)

- [ ] Set up RLS policies (already configured in migration)
  ```sql
  -- Verify policies are working
  SELECT * FROM pg_policies WHERE tablename IN ('orders', 'proxies', 'proxy_assignments');
  ```

## 📊 Monitoring Setup

- [ ] Configure error tracking
  - [ ] Sentry / LogRocket / DataDog
  - [ ] Add to provisioning worker:
    ```typescript
    try {
      await worker.processPendingOrders();
    } catch (error) {
      Sentry.captureException(error);
    }
    ```

- [ ] Set up alerts for:
  - [ ] Failed orders > 5%
  - [ ] Average provisioning time > 60 seconds
  - [ ] No orders processed in last 30 minutes
  - [ ] Worker errors

- [ ] Create dashboard query
  ```sql
  SELECT
    COUNT(*) as total,
    COUNT(CASE WHEN status = 'provisioned' THEN 1 END) as success_count,
    ROUND(COUNT(CASE WHEN status = 'provisioned' THEN 1 END)::float / COUNT(*) * 100, 2) as success_rate
  FROM orders
  WHERE created_at > now() - interval '24 hours';
  ```

## 🎓 Learn the System

### Read Code in Order
1. [ ] `src/lib/api.functions.ts` - API functions (start here)
2. [ ] `src/lib/provisioning-worker.ts` - Core logic
3. [ ] `src/routes/api/webhooks.payment.ts` - Webhook handler
4. [ ] `supabase/migrations/20260706120000_*` - Database schema

### Understand Key Flows
1. [ ] Payment confirmation flow (webhook → order creation → provisioning)
2. [ ] Order status transitions (pending → provisioning → provisioned → delivered)
3. [ ] Retry logic (failed orders retry up to 3 times)
4. [ ] Proxy assignment (filter → find → assign → mark as sold)

## 🐛 Troubleshooting Setup

- [ ] Add logging to provisioning worker
  ```typescript
  console.log(`[${workerId}] Processing ${orders.length} orders...`);
  console.log(`[${workerId}] Order ${order.id}: ${order.status}`);
  ```

- [ ] Enable debug mode
  ```bash
  DEBUG=proxy-provisioning:* npm run dev
  ```

- [ ] Create monitoring queries file
  ```bash
  # Save these queries for quick access
  cp PROVISIONING_CONFIG_EXAMPLES.md ~/monitoring_queries.md
  ```

## ✨ Optional Enhancements

### Phase 2: Notifications
- [ ] Email on order provisioned
- [ ] Email on order failed
- [ ] SMS notifications (Twilio)
- [ ] Telegram notifications (if using TelegramLogin)
- [ ] Webhook notifications to customer

### Phase 3: Browser Automation
- [ ] Install Playwright: `npm install playwright`
- [ ] Implement `fetchProxyViaBrowserAutomation()` in worker
- [ ] Test with real provider
- [ ] Add provider detection logic

### Phase 4: Advanced Features
- [ ] Multi-provider support
- [ ] Proxy rotation
- [ ] Performance tracking
- [ ] Customer analytics
- [ ] Admin dashboard
- [ ] Proxy uptime monitoring

## 📞 Getting Help

If something doesn't work:

1. **Check logs first**
   ```sql
   SELECT * FROM provisioning_logs 
   WHERE status = 'failed' 
   ORDER BY created_at DESC 
   LIMIT 10;
   ```

2. **Review error message**
   - "No available proxies" → Upload more proxies
   - "Timeout" → Increase PROVISIONING_TIMEOUT_MS
   - "Max attempts exceeded" → Check proxy data quality

3. **Test manually**
   ```bash
   # Trigger provisioning manually
   curl -X POST https://your-domain.com/api/provisioning/run
   ```

4. **Check environment variables**
   ```bash
   echo $SUPABASE_URL
   echo $SUPABASE_SERVICE_ROLE_KEY
   # etc.
   ```

5. **Verify database connection**
   ```sql
   SELECT 1; -- Should return 1
   ```

## 🎉 Success Criteria

You'll know it's working when:

✅ Customer purchases proxy → Payment confirmed → Proxy delivered (< 5 seconds)  
✅ Order appears in `orders` table with status "provisioned"  
✅ Proxy appears in `proxy_assignments` linked to order  
✅ Provisioning log shows "success"  
✅ Customer sees credentials in dashboard  
✅ Proxy marked as "leased" in inventory  
✅ No errors in server logs  
✅ Alert emails working (if configured)  

## 📋 Quick Reference

### Common SQL Queries

```sql
-- See all pending orders
SELECT id, user_id, created_at FROM orders WHERE status = 'pending';

-- Check provisioning progress
SELECT status, COUNT(*) FROM orders 
WHERE created_at > now() - interval '1 hour' 
GROUP BY status;

-- View failed orders
SELECT id, failed_reason FROM orders WHERE status = 'failed' LIMIT 10;

-- Check proxy inventory
SELECT status, COUNT(*) FROM proxies GROUP BY status;

-- See provisioning logs for an order
SELECT * FROM provisioning_logs 
WHERE order_id = 'YOUR_ORDER_ID' 
ORDER BY created_at DESC;
```

### Common Environment Variables

```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_PUBLISHABLE_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
PROVISIONING_MAX_ATTEMPTS=3
PROVISIONING_TIMEOUT_MS=30000
NOWPAYMENTS_API_KEY=xxx
NOWPAYMENTS_WEBHOOK_SECRET=xxx
```

---

## ✅ Final Checklist

- [ ] All documentation read
- [ ] Database migration applied
- [ ] Payment provider configured
- [ ] Webhook tested
- [ ] Worker deployed
- [ ] Frontend components integrated
- [ ] Security measures in place
- [ ] Monitoring configured
- [ ] End-to-end test passed
- [ ] Error handling verified
- [ ] Logs reviewed
- [ ] Team trained
- [ ] Ready for production! 🚀

---

**Status:** Ready to implement  
**Estimated Setup Time:** 2-4 hours  
**Support:** See PROXY_PROVISIONING_GUIDE.md for detailed help
