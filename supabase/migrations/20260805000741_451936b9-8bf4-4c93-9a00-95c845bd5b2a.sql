ALTER TABLE public.sales
  ADD COLUMN IF NOT EXISTS original_sold_at timestamptz,
  ADD COLUMN IF NOT EXISTS original_total integer,
  ADD COLUMN IF NOT EXISTS original_note text;

ALTER TABLE public.sale_items
  ADD COLUMN IF NOT EXISTS original_name text,
  ADD COLUMN IF NOT EXISTS original_unit_price integer,
  ADD COLUMN IF NOT EXISTS original_quantity integer;

UPDATE public.sales SET original_sold_at = COALESCE(original_sold_at, sold_at),
  original_total = COALESCE(original_total, total),
  original_note = COALESCE(original_note, note);

UPDATE public.sale_items SET original_name = COALESCE(original_name, name),
  original_unit_price = COALESCE(original_unit_price, unit_price),
  original_quantity = COALESCE(original_quantity, quantity);

CREATE OR REPLACE FUNCTION public.set_sale_originals()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.original_sold_at := COALESCE(NEW.original_sold_at, NEW.sold_at);
  NEW.original_total := COALESCE(NEW.original_total, NEW.total);
  NEW.original_note := COALESCE(NEW.original_note, NEW.note);
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_sale_item_originals()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.original_name := COALESCE(NEW.original_name, NEW.name);
  NEW.original_unit_price := COALESCE(NEW.original_unit_price, NEW.unit_price);
  NEW.original_quantity := COALESCE(NEW.original_quantity, NEW.quantity);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_sale_originals_trg ON public.sales;
CREATE TRIGGER set_sale_originals_trg BEFORE INSERT ON public.sales
FOR EACH ROW EXECUTE FUNCTION public.set_sale_originals();

DROP TRIGGER IF EXISTS set_sale_item_originals_trg ON public.sale_items;
CREATE TRIGGER set_sale_item_originals_trg BEFORE INSERT ON public.sale_items
FOR EACH ROW EXECUTE FUNCTION public.set_sale_item_originals();