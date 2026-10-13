-- 適格請求書対応: 明細ごとの納品日・税率区分・税額・単位
ALTER TABLE public.invoice_lines
    ADD COLUMN IF NOT EXISTS delivery_date date,
    ADD COLUMN IF NOT EXISTS tax_rate numeric(5,2) NOT NULL DEFAULT 10,
    ADD COLUMN IF NOT EXISTS tax_amount numeric(15,2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS unit text;

-- 既存明細は標準税率として税額を補完する。
UPDATE public.invoice_lines
SET tax_amount = FLOOR(COALESCE(amount, 0) * COALESCE(tax_rate, 10) / 100)
WHERE COALESCE(tax_amount, 0) = 0
  AND COALESCE(amount, 0) <> 0
  AND COALESCE(tax_rate, 0) <> 0;

COMMENT ON COLUMN public.invoice_lines.delivery_date IS '明細の納品日';
COMMENT ON COLUMN public.invoice_lines.tax_rate IS '適用税率（10、8、0）';
COMMENT ON COLUMN public.invoice_lines.tax_amount IS '明細単位の消費税額';
COMMENT ON COLUMN public.invoice_lines.unit IS '数量単位';
