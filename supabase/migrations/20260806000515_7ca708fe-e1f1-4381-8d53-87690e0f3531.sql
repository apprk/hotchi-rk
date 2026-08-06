ALTER TABLE public.sales
  ADD COLUMN IF NOT EXISTS subtotal integer,
  ADD COLUMN IF NOT EXISTS discount_type text,
  ADD COLUMN IF NOT EXISTS discount_value integer,
  ADD COLUMN IF NOT EXISTS discount_amount integer NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.day_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL UNIQUE,
  note text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.day_notes TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.day_notes TO authenticated;
GRANT ALL ON public.day_notes TO service_role;

ALTER TABLE public.day_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "day_notes public access" ON public.day_notes
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TRIGGER update_day_notes_updated_at
  BEFORE UPDATE ON public.day_notes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();