# Workspace

## Overview

NexusProxy — a production-ready SaaS proxy service platform. Users pay in crypto (Bitcoin, USDT TRC20, USDC) for residential/datacenter/mobile proxy access with automated subscription expiry, bandwidth tracking, admin panel, and user dashboard.

pnpm workspace monorepo using TypeScript.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Frontend**: React + Vite + Wouter + TanStack Query + Clerk auth + Tailwind + Framer Motion + Shadcn UI
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Auth**: Clerk (appId: app_3CWhpyEomlj5dZEkCumj9ar0tCz)
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild

## Artifacts

- `artifacts/nexusproxy` — Frontend web app at `/nexusproxy`
- `artifacts/api-server` — Backend Express API server

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

## Database Schema (8 tables)

- `users` — Clerk-synced users (id = Clerk userId string), role: "user" | "admin"
- `plans` — subscription plans (id is varchar string like "plan_starter")
- `proxies` — proxy credentials (ip, port, username, password, proxyType, country, **city, isp, latencyMs, status, lastCheckedAt, priceCents** + uniqueIndex on ip+port)
- `payments` — crypto payment records (currency: BTC/USDT_TRC20/USDC, status: pending/confirmed/failed). For cart purchases, `planId="cart"` sentinel is used.
- `subscriptions` — user subscriptions (status: active/expired/cancelled/pending)
- `user_proxies` — junction: which proxies are assigned to which subscriptions
- `usage_logs` — bandwidth/connection usage tracking
- **`cart_items`** — temporary 15-min reservations (uniqueIndex on proxyId enforces one-active-reservation-per-proxy)

## Seeded Data

- **25 plans** matching marketplace pricing tiers:
  - SOCKS5 Residential by IP (1300/2600/4500/8000 IPs, 30-day)
  - SOCKS5 Residential by GB (5/10/20/30 GB packs)
  - Rotating ISP / Residential (130/280/500/1000 ports)
  - Unlimited Residential (1d/3d/7d/14d/30d unlimited bandwidth)
  - Plus legacy Daily/Starter/Pro/Business
- 11 demo proxies (residential / datacenter / isp / mobile) across US/DE/UK/FR/NL/SG with realistic priceCents

## Marketplace Flow (Cart-based purchase)

1. User browses public `GET /api/proxies` (filter by search/country/type) on `/proxies/proxy-list`
2. `POST /api/cart` reserves a proxy for 15 min (uniqueIndex prevents double-reservation)
3. Cart cleanup job (every 1 min) deletes expired `cart_items`
4. `POST /api/purchase` converts cart → pending Payment + pending Subscription + pre-assigned (inactive) `user_proxies` rows
5. User pays crypto on `/payment?paymentId=...` page
6. Admin confirms in `/admin` → cart-payment flow flips subscription to `active` + flips user_proxies to `isActive=true`

## Frontend Routes

- Public: `/`, `/sign-in`, `/sign-up`
- App: `/dashboard` (banner + featured plans + setup guides), `/plans`, `/payment`, `/cart`
- Proxies: `/proxies/proxy-list`, `/proxies/proxy-settings`
- Products: `/proxy-server`, `/static-residential`, `/rotating-residential` (all reuse `<ProxyList initialType="..."/>`)
- Account: `/subscription`, `/referral`, `/api`, `/settings`, `/stats`, `/usage`
- Admin: `/admin` (gated by `role === "admin"`)
- Layout: `AppLayout` with collapsible grouped sidebar + cart-count header button

## Important Notes

- **Crypto wallets**: Addresses in `artifacts/api-server/src/lib/crypto-wallets.ts` are placeholders. Set WALLET_BTC, WALLET_USDT_TRC20, WALLET_USDC secrets for real payments.
- **Admin role**: Promote first user via SQL: `UPDATE users SET role='admin' WHERE email='terry4white1956@gmail.com'`
- **Payment flow**: Configurable via `system_settings.auto_confirm_payments`. When OFF (default) admin must approve in panel. When ON, on-chain verification runs at tx-hash submit (BTC blockstream, USDT-TRC20 trongrid, USDC etherscan); failures stay pending with `adminNote: "Needs admin review: ..."`.
- **Auto-gen creds**: Single-add and bulk-add proxy admin endpoints fill missing username/password via `lib/proxy-creds.ts`. Backfill script: `pnpm tsx artifacts/api-server/src/scripts/backfill-creds.ts`.
- **Admin edits**: PATCH `/api/admin/proxies/:id` and `/api/admin/subscriptions/:id` allow inline edits via Admin → Proxies / Subs tabs.
- **OTP autofill**: `useDisableOtpAutofill` in `App.tsx` strips `autocomplete="one-time-code"` from Clerk verification inputs to prevent SMS/email autofill prompts.
- **Download gating**: Public `/proxies/proxy-list` shows blurred IPs and no download button; only `/proxies` (My Proxies) page has Copy All / Export TXT for confirmed/assigned proxies.
- **Expiry job**: Runs every 5 minutes, expires subscriptions and revokes proxy access
- **Base path**: `/nexusproxy` — all routing uses `import.meta.env.BASE_URL`
- **priceUsd**: Stored in cents (divide by 100 to display)

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
