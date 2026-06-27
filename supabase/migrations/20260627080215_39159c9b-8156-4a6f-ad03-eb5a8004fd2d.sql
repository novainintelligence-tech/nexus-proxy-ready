ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS telegram_id BIGINT UNIQUE;
CREATE INDEX IF NOT EXISTS profiles_telegram_id_idx ON public.profiles(telegram_id);