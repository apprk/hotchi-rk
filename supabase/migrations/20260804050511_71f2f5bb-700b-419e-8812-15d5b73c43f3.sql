CREATE TABLE public.account_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  category TEXT NOT NULL,
  amount INTEGER NOT NULL CHECK (amount > 0),
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_account_records_date ON public.account_records(date DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.account_records TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.account_records TO authenticated;
GRANT ALL ON public.account_records TO service_role;

ALTER TABLE public.account_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anonymous access to account records"
ON public.account_records
FOR ALL
TO anon
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow authenticated access to account records"
ON public.account_records
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);