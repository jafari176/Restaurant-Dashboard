-- ================================================
-- MIGRATION: Weekend specials
-- ================================================
-- The owner adds and toggles weekend specials from the dashboard; the voice
-- agent reads the live ones at the start of each call. Names are bilingual
-- because the agent answers in English and Canadian French.

CREATE TABLE IF NOT EXISTS public.specials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name_en TEXT NOT NULL,
  name_fr TEXT,
  description TEXT,
  price NUMERIC(6, 2) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT specials_price_positive CHECK (price > 0),
  CONSTRAINT specials_dates_ordered CHECK (end_date >= start_date)
);

-- The call-start webhook has a 500ms budget and filters on exactly these
-- three columns, so they are indexed together.
CREATE INDEX IF NOT EXISTS idx_specials_live
  ON public.specials (is_active, start_date, end_date);

-- Same open policy as orders and customers: the dashboard talks to PostgREST
-- with the publishable key and there is no login in front of it yet.
ALTER TABLE public.specials ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access on specials" ON public.specials;
DROP POLICY IF EXISTS "Allow public insert access on specials" ON public.specials;
DROP POLICY IF EXISTS "Allow public update access on specials" ON public.specials;
DROP POLICY IF EXISTS "Allow public delete access on specials" ON public.specials;

CREATE POLICY "Allow public read access on specials"
  ON public.specials FOR SELECT USING (true);
CREATE POLICY "Allow public insert access on specials"
  ON public.specials FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access on specials"
  ON public.specials FOR UPDATE USING (true);
CREATE POLICY "Allow public delete access on specials"
  ON public.specials FOR DELETE USING (true);

-- ------------------------------------------------
-- Keep updated_at honest.
-- ------------------------------------------------
CREATE OR REPLACE FUNCTION touch_specials_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_specials_updated_at ON public.specials;

CREATE TRIGGER trigger_specials_updated_at
  BEFORE UPDATE ON public.specials
  FOR EACH ROW
  EXECUTE FUNCTION touch_specials_updated_at();

-- ------------------------------------------------
-- Live specials, as the dashboard badge and the call-start webhook both
-- define them: active, and today in America/Toronto falls inside the range.
-- Kept in SQL so the dashboard and the agent can never disagree.
-- ------------------------------------------------
CREATE OR REPLACE FUNCTION public.live_specials()
RETURNS SETOF public.specials AS $$
  SELECT *
  FROM public.specials
  WHERE is_active
    AND (now() AT TIME ZONE 'America/Toronto')::date BETWEEN start_date AND end_date
  ORDER BY price;
$$ LANGUAGE sql STABLE;

-- Realtime, so an edit on the iPad updates another open dashboard.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'specials'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.specials;
  END IF;
END $$;
