-- ============================================================
-- マルチテナント対応 Phase 1-2: 全テーブルに company_id 追加
-- 
-- ⚠️ 重要: Phase 1-1 を先に実行してください
--
-- Supabase Dashboard の SQL Editor で実行してください
-- https://supabase.com/dashboard/project/egrrqzfyzukuhzsavuky/sql/new
-- ============================================================

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- STEP 1: company_id カラムを追加（NULLable で安全に）
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- マスタテーブル
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);
ALTER TABLE public.supplier_products ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);

-- トランザクションテーブル
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);
ALTER TABLE public.order_lines ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);
ALTER TABLE public.quote_lines ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);
ALTER TABLE public.invoice_lines ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);
ALTER TABLE public.purchases ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);
-- purchase_lines テーブルが存在しない場合はスキップ
DO $$ BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'purchase_lines') THEN
    EXECUTE 'ALTER TABLE public.purchase_lines ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id)';
  END IF;
END $$;


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- STEP 2: 既存データのバックフィル
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- マスタテーブル
UPDATE public.customers SET company_id = (SELECT id FROM public.companies LIMIT 1) WHERE company_id IS NULL;
UPDATE public.suppliers SET company_id = (SELECT id FROM public.companies LIMIT 1) WHERE company_id IS NULL;
UPDATE public.products SET company_id = (SELECT id FROM public.companies LIMIT 1) WHERE company_id IS NULL;
UPDATE public.supplier_products SET company_id = (SELECT id FROM public.companies LIMIT 1) WHERE company_id IS NULL;

-- トランザクションテーブル
UPDATE public.orders SET company_id = (SELECT id FROM public.companies LIMIT 1) WHERE company_id IS NULL;
UPDATE public.order_lines SET company_id = (SELECT id FROM public.companies LIMIT 1) WHERE company_id IS NULL;
UPDATE public.quotes SET company_id = (SELECT id FROM public.companies LIMIT 1) WHERE company_id IS NULL;
UPDATE public.quote_lines SET company_id = (SELECT id FROM public.companies LIMIT 1) WHERE company_id IS NULL;
UPDATE public.invoices SET company_id = (SELECT id FROM public.companies LIMIT 1) WHERE company_id IS NULL;
UPDATE public.invoice_lines SET company_id = (SELECT id FROM public.companies LIMIT 1) WHERE company_id IS NULL;
UPDATE public.purchases SET company_id = (SELECT id FROM public.companies LIMIT 1) WHERE company_id IS NULL;
DO $$ BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'purchase_lines') THEN
    EXECUTE 'UPDATE public.purchase_lines SET company_id = (SELECT id FROM public.companies LIMIT 1) WHERE company_id IS NULL';
  END IF;
END $$;


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- STEP 3: NOT NULL 制約を追加
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ALTER TABLE public.customers ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE public.suppliers ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE public.products ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE public.supplier_products ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE public.orders ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE public.order_lines ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE public.quotes ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE public.quote_lines ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE public.invoices ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE public.invoice_lines ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE public.purchases ALTER COLUMN company_id SET NOT NULL;
DO $$ BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'purchase_lines') THEN
    EXECUTE 'ALTER TABLE public.purchase_lines ALTER COLUMN company_id SET NOT NULL';
  END IF;
END $$;


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- STEP 4: インデックス作成
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE INDEX IF NOT EXISTS idx_customers_company ON public.customers(company_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_company ON public.suppliers(company_id);
CREATE INDEX IF NOT EXISTS idx_products_company ON public.products(company_id);
CREATE INDEX IF NOT EXISTS idx_supplier_products_company ON public.supplier_products(company_id);
CREATE INDEX IF NOT EXISTS idx_orders_company ON public.orders(company_id);
CREATE INDEX IF NOT EXISTS idx_order_lines_company ON public.order_lines(company_id);
CREATE INDEX IF NOT EXISTS idx_quotes_company ON public.quotes(company_id);
CREATE INDEX IF NOT EXISTS idx_quote_lines_company ON public.quote_lines(company_id);
CREATE INDEX IF NOT EXISTS idx_invoices_company ON public.invoices(company_id);
CREATE INDEX IF NOT EXISTS idx_invoice_lines_company ON public.invoice_lines(company_id);
CREATE INDEX IF NOT EXISTS idx_purchases_company ON public.purchases(company_id);
DO $$ BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'purchase_lines') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_purchase_lines_company ON public.purchase_lines(company_id)';
  END IF;
END $$;

SELECT 'Phase 1-2 完了: 全テーブルに company_id 追加、バックフィル、NOT NULL制約、インデックス作成' AS result;
