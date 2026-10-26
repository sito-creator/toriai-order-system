-- POS現金会計。明細・発行者は取引時点のスナップショットとして保存。
CREATE TABLE IF NOT EXISTS public.pos_sales (
 id uuid PRIMARY KEY,
 company_id uuid NOT NULL REFERENCES public.companies(id),
 created_by uuid NOT NULL REFERENCES auth.users(id),
 created_at timestamptz NOT NULL DEFAULT now(),
 lines jsonb NOT NULL,
 issuer jsonb NOT NULL,
 subtotal integer NOT NULL CHECK (subtotal >= 0),
 tax integer NOT NULL CHECK (tax >= 0),
 total integer NOT NULL CHECK (total > 0 AND total = subtotal + tax),
 received integer NOT NULL CHECK (received >= total),
 change integer NOT NULL CHECK (change = received - total),
 payment_method text NOT NULL DEFAULT 'cash' CHECK (payment_method = 'cash'),
 status text NOT NULL DEFAULT 'paid' CHECK (status IN ('paid', 'voided')),
 void_reason text,
 voided_at timestamptz,
 voided_by uuid REFERENCES auth.users(id)
);
CREATE INDEX IF NOT EXISTS pos_sales_company_date ON public.pos_sales(company_id, created_at DESC);
ALTER TABLE public.pos_sales ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS pos_sales_select ON public.pos_sales;
CREATE POLICY pos_sales_select ON public.pos_sales FOR SELECT TO authenticated USING (company_id = public.get_my_company_id());
-- 書き込みは認証済みサーバーAPIで検証し、管理者クライアントから実行。
REVOKE INSERT, UPDATE, DELETE ON public.pos_sales FROM anon, authenticated;
GRANT SELECT ON public.pos_sales TO authenticated;
GRANT ALL ON public.pos_sales TO service_role;
