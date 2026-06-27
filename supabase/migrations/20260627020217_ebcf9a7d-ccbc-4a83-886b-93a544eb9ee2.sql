ALTER TABLE public.proxies
  ADD COLUMN IF NOT EXISTS auth_type text NOT NULL DEFAULT 'userpass',
  ADD COLUMN IF NOT EXISTS last_view_at timestamptz;

CREATE INDEX IF NOT EXISTS proxies_proxy_type_idx ON public.proxies(proxy_type);
CREATE INDEX IF NOT EXISTS proxies_auth_type_idx ON public.proxies(auth_type);
CREATE INDEX IF NOT EXISTS proxies_blacklist_idx ON public.proxies(blacklist);
CREATE INDEX IF NOT EXISTS proxies_zipcode_idx ON public.proxies(zipcode);