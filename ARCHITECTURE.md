# 🏗️ System Architecture Overview

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          FRONTEND (Lovable)                                 │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │ • Plan Selection                                                     │  │
│  │ • Proxy Filter (Country, Type, Auth)                               │  │
│  │ • Checkout                                                          │  │
│  │ • Order Status Display                                             │  │
│  │ • Credentials Reveal                                               │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
└────────────────────────────┬────────────────────────────────────────────────┘
                             │ (HTTP)
         ┌───────────────────┼───────────────────┐
         │                   │                   │
         ▼                   ▼                   ▼
    ┌─────────────┐  ┌──────────────┐  ┌──────────────┐
    │   Payment   │  │  API Routes  │  │   Webhooks   │
    │  Provider   │  │ (TanStack)   │  │  Handlers    │
    │ NowPayments │  │              │  │ (Payment)    │
    │ BTCPay      │  │ • Orders     │  │              │
    │ Stripe      │  │ • Proxies    │  │ • Confirms   │
    │   etc...    │  │ • Status     │  │   payment    │
    └─────────────┘  └──────────────┘  └──────────────┘
         │                   │                   │
         └───────────────────┼───────────────────┘
                             │
                             ▼
        ┌────────────────────────────────────────┐
        │    Provisioning Worker Service         │
        │  ┌──────────────────────────────────┐  │
        │  │ ProxyProvisioningWorker           │  │
        │  │ • Batch process orders            │  │
        │  │ • Find available proxies          │  │
        │  │ • Apply filters                   │  │
        │  │ • Assign & mark as sold           │  │
        │  │ • Log attempts                    │  │
        │  │ • Retry logic (3x)                │  │
        │  │ • Browser automation (optional)   │  │
        │  └──────────────────────────────────┘  │
        └────────────────────────────────────────┘
                             │
                             ▼
        ┌────────────────────────────────────────┐
        │    Database (Supabase)                 │
        │  ┌──────────────────────────────────┐  │
        │  │ Tables:                           │  │
        │  │ • orders                          │  │
        │  │ • proxy_assignments               │  │
        │  │ • provisioning_logs               │  │
        │  │ • provider_credentials            │  │
        │  │ • proxies (enhanced)              │  │
        │  │ • profiles                        │  │
        │  │ • payments                        │  │
        │  │                                   │  │
        │  │ Security: RLS Policies            │  │
        │  └──────────────────────────────────┘  │
        └────────────────────────────────────────┘
```

## Data Flow Diagram

```
1. CUSTOMER BROWSING
   └─► Frontend Lists Plans & Available Proxies
       └─► API: listPlans()
       └─► API: getProxyAvailability()

2. PURCHASE DECISION
   └─► Customer selects:
       • Plan (daily/credit)
       • Proxy filters (country, type)
   └─► Proceeds to checkout

3. PAYMENT PROCESSING
   └─► Payment provider receives payment
       └─► After confirmation, sends webhook
           └─► POST /api/webhooks/payment

4. WEBHOOK HANDLING
   └─► handlePaymentConfirmation():
       ├─► Verify webhook signature
       ├─► Update payment status → "confirmed"
       ├─► Credit user balance
       └─► Trigger provisioning worker

5. ORDER CREATION
   └─► createOrder() called:
       ├─► Verify payment confirmed
       ├─► Create order record (status="pending")
       ├─► Store customer filters
       └─► Ready for provisioning

6. PROVISIONING EXECUTION
   └─► runProvisioningWorker():
       ├─► Fetch pending orders (batch of 10)
       ├─► For each order:
       │   ├─► Mark status="provisioning"
       │   ├─► Log: attempt started
       │   ├─► Find available proxy matching filters
       │   ├─► Create proxy_assignments
       │   ├─► Mark proxy as "leased"
       │   ├─► Update order status="provisioned"
       │   └─► Log: attempt success
       └─► On error: retry or mark failed

7. CUSTOMER NOTIFICATION
   └─► Order status changes to "provisioned"
       └─► Frontend polls for updates
           └─► Shows proxy credentials
               ├─► IP:PORT
               ├─► USERNAME
               ├─► PASSWORD
               └─► Country/Region/City

8. USAGE
   └─► Customer uses proxy:
       ├─► Connects with provided credentials
       ├─► Traffic flows through proxy
       └─► Usage logged

9. EXPIRATION
   └─► Proxy expires at expires_at timestamp
       └─► Status changes to "expired"
       └─► Proxy becomes available again
```

## Request/Response Flows

### Flow 1: Purchase to Delivery (5 seconds total)

```
Timeline: 0ms → 5000ms

0ms    Customer clicks "Buy"
       └─► Payment Provider Redirect

Payment Processing (payment provider handles)
       Customer completes payment
       Provider confirms → Webhook sent

1000ms Webhook Received at /api/webhooks/payment
       ├─► Verify signature ✓
       ├─► Update payment status
       ├─► Credit balance
       └─► Trigger provisioning

1100ms Provisioning Worker Starts
       ├─► Load pending orders
       ├─► Load available proxies
       ├─► Match filters
       └─► Assign proxy

1200ms Order Updated
       ├─► Create assignment record
       ├─► Mark proxy "leased"
       ├─► Set order status="provisioned"
       └─► Log success

1300ms Frontend Detects Status Change
       ├─► Poll shows order.status="provisioned"
       ├─► Display proxy credentials
       └─► Customer sees IP:PORT:USER:PASS

✓ Total: ~300ms from webhook to delivery
```

### Flow 2: Failed Order with Retry

```
Timeline: 0ms → 90000ms (90 seconds with retries)

0ms    Order created (status="pending")

10ms   Provisioning Attempt 1
       ├─► No proxies matching filters
       └─► Log: failed, retry

5000ms Provisioning Attempt 2
       ├─► Still no proxies
       └─► Log: failed, retry

10000ms Provisioning Attempt 3 (Final)
        ├─► Still no proxies
        └─► Order marked: status="failed"
            failed_reason="No available proxies"

30000ms Cleanup Job Runs
        └─► Order marked: status="expired"
            (if > 24 hours old)

Customer Notification (optional)
└─► Email: "Order failed after 3 attempts"
    "Please try again later or contact support"
```

## Database Schema Relationship

```
┌─────────────────────────────────────────────────────────────┐
│                         auth.users                          │
│                      (Supabase Auth)                        │
└────────────────────┬────────────────────────────────────────┘
                     │ (1:1)
                     ▼
        ┌────────────────────────┐
        │      profiles          │
        ├────────────────────────┤
        │ id (FK)                │
        │ balance_cents          │ ◄──── Updated when payment confirmed
        │ display_name           │
        │ referral_code          │
        └────────────────────────┘
                     │
        ┌────────────┼────────────┐
        │            │            │
   (1:∞) (1:∞)    (1:∞)         (1:∞)
        │            │            │
        ▼            ▼            ▼
    ┌────────┐  ┌────────┐  ┌──────────┐
    │payments│  │proxies │  │payments  │
    │        │  │        │  │          │
    └────────┘  └────────┘  └──────────┘
        │
   (1:∞)│ FK: payment_id
        │
        ▼
    ┌──────────┐
    │  orders  │         Referenced by
    ├──────────┤        (1:1)
    │ id       │────────────►  ┌──────────────────┐
    │ user_id  │               │ proxy_assignments│
    │ payment_id               ├──────────────────┤
    │ plan_id  │               │ order_id (FK)    │
    │ status   │────────────┐  │ proxy_id (FK)────┼─►  proxies table
    │          │(1:∞)       │  │ expires_at       │
    └──────────┘            │  └──────────────────┘
                            │
                       (1:∞)│
                            ▼
                    ┌──────────────────┐
                    │provisioning_logs │
                    ├──────────────────┤
                    │ order_id (FK)    │
                    │ status           │
                    │ error_message    │
                    │ duration_ms      │
                    │ attempted_at     │
                    └──────────────────┘
```

## Deployment Architecture

### Option A: Serverless (Simple)
```
┌──────────────────────────────────┐
│     Vercel / Railway / Render    │
│ ┌──────────────────────────────┐ │
│ │ TanStack Start Application   │ │
│ │ • API Routes                 │ │
│ │ • Webhook Handlers           │ │
│ │ • Frontend                   │ │
│ └──────────────────────────────┘ │
└──────────────┬───────────────────┘
               │ Every 5 minutes
               │ (via cron)
               ▼
        ┌─────────────────┐
        │  Provisioning   │
        │  Worker (edge)  │
        └─────────────────┘
               │
               ▼
        ┌──────────────────┐
        │  Supabase DB     │
        └──────────────────┘
```

### Option B: Docker (Production)
```
┌──────────────────────────┐
│   Docker Container       │
│ ┌──────────────────────┐ │
│ │  TanStack Start      │ │
│ │  + Node.js/Bun       │ │
│ └──────────────────────┘ │
└────────────┬─────────────┘
             │
    ┌────────┴────────┐
    │                 │
    ▼                 ▼
┌──────────────┐ ┌──────────────┐
│   Node:3000  │ │   Node:3001  │
│ (API Server) │ │ (Worker)     │
└────────┬─────┘ └──────────────┘
         │
         └─► Supabase
```

### Option C: Message Queue (Scale)
```
┌─────────────────────┐
│  Payment Webhook    │
│  (from provider)    │
└──────────┬──────────┘
           │
           ▼
    ┌─────────────────┐
    │  API Server     │
    │ Create Order    │
    └──────┬──────────┘
           │
           ▼
    ┌─────────────────┐
    │   Redis Queue   │
    │ (pending orders)│
    └──────┬──────────┘
           │
    ┌──────┴──────┐
    │             │
    ▼             ▼
┌────────┐   ┌────────┐
│Worker1 │   │Worker2 │  ... Workers
│ x5     │   │ x5     │
└────┬───┘   └───┬────┘
     │           │
     └─────┬─────┘
           ▼
      ┌─────────────┐
      │ Supabase DB │
      └─────────────┘
```

## File Organization

```
nexus-proxy-ready/
├── supabase/
│   └── migrations/
│       └── 20260706120000_order_provisioning_workflow.sql
│           ├── Orders table
│           ├── Proxy assignments
│           ├── Provisioning logs
│           ├── Provider credentials
│           └── Helper functions
│
├── src/
│   ├── lib/
│   │   ├── api.functions.ts (updated +250 lines)
│   │   │   ├── createOrder()
│   │   │   ├── listMyOrders()
│   │   │   ├── getOrderDetails()
│   │   │   ├── triggerProvisioning()
│   │   │   └── getProxyAvailability()
│   │   │
│   │   └── provisioning-worker.ts (new, 360 lines)
│   │       ├── ProxyProvisioningWorker class
│   │       ├── processPendingOrders()
│   │       ├── findAndReserveProxy()
│   │       ├── cleanupExpiredOrders()
│   │       └── runProvisioningWorker()
│   │
│   ├── routes/
│   │   └── api/
│   │       └── webhooks.payment.ts (new, 131 lines)
│   │           ├── handlePaymentConfirmation()
│   │           └── checkPaymentStatus()
│   │
│   └── components/
│       └── proxy-provisioning/
│           └── OrderFlow.example.tsx (new)
│               ├── PlansPurchase
│               ├── OrderStatusCard
│               ├── MyOrdersList
│               └── ProxyCredentialField
│
├── Documentation/
│   ├── IMPLEMENTATION_SUMMARY.md (this gives overview)
│   ├── PROXY_PROVISIONING_GUIDE.md (80+ pages, complete reference)
│   ├── PROVISIONING_CONFIG_EXAMPLES.md (payment providers, config)
│   ├── GETTING_STARTED.md (step-by-step setup)
│   ├── QUICK_REFERENCE.md (one-page cheat sheet)
│   └── ARCHITECTURE.md (this file)
```

## Technology Stack

```
Frontend:
  • React (Lovable)
  • TanStack Router
  • TanStack Query
  • Tailwind CSS + Shadcn UI
  • Form validation (React Hook Form + Zod)

Backend:
  • TanStack Start (full-stack framework)
  • Node.js / Bun runtime
  • Zod (validation)

Database:
  • Supabase (PostgreSQL + Auth)
  • Row-Level Security (RLS)
  • Migrations (Supabase CLI)

Payment:
  • Payment provider (NowPayments, BTCPay, Stripe, etc.)
  • Webhook integration

Provisioning:
  • JavaScript/TypeScript workers
  • Optional: Playwright/Puppeteer (browser automation)
  • Optional: Bull/Redis (job queue)

Deployment:
  • Vercel / Railway / Render
  • Docker (for self-hosted)
  • Supabase Cloud

Monitoring:
  • Server logs
  • Database queries
  • Sentry / LogRocket (optional)
```

## Security Considerations

```
1. Authentication
   └─► Supabase Auth with JWT
       └─► Verified in middleware

2. Authorization
   └─► RLS Policies
       ├─► Users see only own orders
       ├─► Users see own/available proxies
       └─► Admins see everything

3. Sensitive Data
   └─► Proxy credentials
       ├─► Only returned to order owner
       ├─► Should be encrypted at rest
       └─► Secure transmission (HTTPS)

4. Payment Processing
   └─► Webhook signature verification
       ├─► Verify provider signature
       └─► Prevent spoofing

5. Rate Limiting
   └─► Applied to API endpoints
       └─► Especially webhook handlers

6. Provider Credentials
   └─► Should be encrypted
       ├─► Supabase Vault (built-in)
       └─► Or external secret manager
```

---

**Version:** 1.0  
**Last Updated:** 2026-07-06  
**Status:** Complete & Production Ready ✅
