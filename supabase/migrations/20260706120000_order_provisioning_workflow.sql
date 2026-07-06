-- ============ provider_credentials ============
-- Stores login info for upstream proxy providers
CREATE TABLE public.provider_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_name TEXT NOT NULL,
  username TEXT NOT NULL,
  password TEXT NOT NULL, -- should be encrypted in production
  api_key TEXT,
  api_secret TEXT,
  extra_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.provider_credentials TO service_role;
GRANT ALL ON public.provider_credentials TO service_role;
ALTER TABLE public.provider_credentials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin manage provider creds" ON public.provider_credentials FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============ orders ============
-- Tracks proxy purchases with fulfillment status
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES public.plans(id),
  payment_id UUID NOT NULL REFERENCES public.payments(id),
  
  -- Requested filters
  country TEXT,
  proxy_type TEXT NOT NULL DEFAULT 'residential',
  auth_type TEXT NOT NULL DEFAULT 'userpass',
  
  -- Fulfillment status
  status TEXT NOT NULL DEFAULT 'pending', -- pending, provisioning, provisioned, delivered, failed, cancelled
  provisioning_attempts INTEGER NOT NULL DEFAULT 0,
  max_provisioning_attempts INTEGER NOT NULL DEFAULT 3,
  
  -- Fulfillment tracking
  provisioned_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  failed_reason TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '24 hours')
);
CREATE INDEX ON public.orders (user_id);
CREATE INDEX ON public.orders (status);
CREATE INDEX ON public.orders (payment_id);
CREATE INDEX ON public.orders (expires_at);
GRANT SELECT ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "view own orders" ON public.orders FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin manage orders" ON public.orders FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============ proxy_assignments ============
-- Links proxies to specific orders
CREATE TABLE public.proxy_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  proxy_id UUID NOT NULL REFERENCES public.proxies(id),
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  
  UNIQUE (order_id)
);
CREATE INDEX ON public.proxy_assignments (order_id);
CREATE INDEX ON public.proxy_assignments (proxy_id);
CREATE INDEX ON public.proxy_assignments (expires_at);
GRANT SELECT ON public.proxy_assignments TO authenticated;
GRANT ALL ON public.proxy_assignments TO service_role;
ALTER TABLE public.proxy_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "view own assignments" ON public.proxy_assignments FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.orders WHERE id = order_id AND user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );

-- ============ provisioning_logs ============
-- Tracks automation attempts and results
CREATE TABLE public.provisioning_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  worker_id TEXT,
  attempt_number INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, in_progress, success, failed, timeout
  
  -- Automation details
  provider_name TEXT,
  provider_response JSONB,
  error_message TEXT,
  
  -- Performance tracking
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON public.provisioning_logs (order_id);
CREATE INDEX ON public.provisioning_logs (status);
CREATE INDEX ON public.provisioning_logs (created_at DESC);
GRANT SELECT ON public.provisioning_logs TO authenticated;
GRANT ALL ON public.provisioning_logs TO service_role;
ALTER TABLE public.provisioning_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin view logs" ON public.provisioning_logs FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ============ Modified proxies table ============
-- Add order-related tracking columns
ALTER TABLE public.proxies ADD COLUMN IF NOT EXISTS
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL;

ALTER TABLE public.proxies ADD COLUMN IF NOT EXISTS
  leased_until TIMESTAMPTZ;

ALTER TABLE public.proxies ADD COLUMN IF NOT EXISTS
  provisioned_from TEXT, -- e.g., "provider_x_api", "browser_automation"
  provisioned_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS proxies_order_id_idx ON public.proxies(order_id);
CREATE INDEX IF NOT EXISTS proxies_leased_until_idx ON public.proxies(leased_until);

-- ============ Helper functions ============

-- Mark proxy as sold/reserved
CREATE OR REPLACE FUNCTION public.assign_proxy_to_order(
  p_order_id UUID,
  p_proxy_id UUID,
  p_lease_duration_days INT DEFAULT 30
) RETURNS proxy_assignments AS $$
  INSERT INTO public.proxy_assignments (order_id, proxy_id, expires_at)
  VALUES (p_order_id, p_proxy_id, now() + (p_lease_duration_days || ' days')::interval)
  RETURNING *;
$$ LANGUAGE SQL;

-- Fetch available proxy count for filters
CREATE OR REPLACE FUNCTION public.count_available_proxies(
  p_country TEXT DEFAULT NULL,
  p_proxy_type TEXT DEFAULT NULL,
  p_auth_type TEXT DEFAULT NULL
) RETURNS INTEGER AS $$
  SELECT COUNT(*) FROM public.proxies
  WHERE status = 'available'
    AND (p_country IS NULL OR country = p_country)
    AND (p_proxy_type IS NULL OR proxy_type = p_proxy_type)
    AND (p_auth_type IS NULL OR auth_type = p_auth_type)
    AND NOT blacklist;
$$ LANGUAGE SQL STABLE;

GRANT EXECUTE ON FUNCTION public.assign_proxy_to_order TO service_role;
GRANT EXECUTE ON FUNCTION public.count_available_proxies TO service_role;
