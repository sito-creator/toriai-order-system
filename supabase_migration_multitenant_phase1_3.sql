-- ============================================================
-- マルチテナント対応 Phase 1-3: RLS ポリシーの一括適用
--
-- ⚠️ 重要: Phase 1-1, 1-2 を先に実行してください
--
-- Supabase Dashboard の SQL Editor で実行してください
-- https://supabase.com/dashboard/project/egrrqzfyzukuhzsavuky/sql/new
-- ============================================================

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 既存RLSポリシーのクリーンアップ（衝突防止）
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- customers
DROP POLICY IF EXISTS "customers_select_own_company" ON public.customers;
DROP POLICY IF EXISTS "customers_insert_own_company" ON public.customers;
DROP POLICY IF EXISTS "customers_update_own_company" ON public.customers;
DROP POLICY IF EXISTS "customers_delete_own_company" ON public.customers;

-- suppliers
DROP POLICY IF EXISTS "suppliers_select_own_company" ON public.suppliers;
DROP POLICY IF EXISTS "suppliers_insert_own_company" ON public.suppliers;
DROP POLICY IF EXISTS "suppliers_update_own_company" ON public.suppliers;
DROP POLICY IF EXISTS "suppliers_delete_own_company" ON public.suppliers;

-- products
DROP POLICY IF EXISTS "products_select_own_company" ON public.products;
DROP POLICY IF EXISTS "products_insert_own_company" ON public.products;
DROP POLICY IF EXISTS "products_update_own_company" ON public.products;
DROP POLICY IF EXISTS "products_delete_own_company" ON public.products;

-- supplier_products
DROP POLICY IF EXISTS "supplier_products_select_own_company" ON public.supplier_products;
DROP POLICY IF EXISTS "supplier_products_insert_own_company" ON public.supplier_products;
DROP POLICY IF EXISTS "supplier_products_update_own_company" ON public.supplier_products;
DROP POLICY IF EXISTS "supplier_products_delete_own_company" ON public.supplier_products;

-- orders (既存ポリシーを一旦削除して統一)
DROP POLICY IF EXISTS "orders_select_own_company" ON public.orders;
DROP POLICY IF EXISTS "orders_insert_own_company" ON public.orders;
DROP POLICY IF EXISTS "orders_update_own_company" ON public.orders;
DROP POLICY IF EXISTS "orders_delete_own_company" ON public.orders;
DROP POLICY IF EXISTS "Users can view orders" ON public.orders;
DROP POLICY IF EXISTS "Users can insert orders" ON public.orders;
DROP POLICY IF EXISTS "Users can update orders" ON public.orders;
DROP POLICY IF EXISTS "Users can delete orders" ON public.orders;

-- order_lines
DROP POLICY IF EXISTS "order_lines_select_own_company" ON public.order_lines;
DROP POLICY IF EXISTS "order_lines_insert_own_company" ON public.order_lines;
DROP POLICY IF EXISTS "order_lines_update_own_company" ON public.order_lines;
DROP POLICY IF EXISTS "order_lines_delete_own_company" ON public.order_lines;
DROP POLICY IF EXISTS "Users can view order lines" ON public.order_lines;
DROP POLICY IF EXISTS "Users can insert order lines" ON public.order_lines;
DROP POLICY IF EXISTS "Users can update order lines" ON public.order_lines;
DROP POLICY IF EXISTS "Users can delete order lines" ON public.order_lines;

-- quotes
DROP POLICY IF EXISTS "quotes_select_own_company" ON public.quotes;
DROP POLICY IF EXISTS "quotes_insert_own_company" ON public.quotes;
DROP POLICY IF EXISTS "quotes_update_own_company" ON public.quotes;
DROP POLICY IF EXISTS "quotes_delete_own_company" ON public.quotes;

-- quote_lines
DROP POLICY IF EXISTS "quote_lines_select_own_company" ON public.quote_lines;
DROP POLICY IF EXISTS "quote_lines_insert_own_company" ON public.quote_lines;
DROP POLICY IF EXISTS "quote_lines_update_own_company" ON public.quote_lines;
DROP POLICY IF EXISTS "quote_lines_delete_own_company" ON public.quote_lines;

-- invoices
DROP POLICY IF EXISTS "invoices_select_own_company" ON public.invoices;
DROP POLICY IF EXISTS "invoices_insert_own_company" ON public.invoices;
DROP POLICY IF EXISTS "invoices_update_own_company" ON public.invoices;
DROP POLICY IF EXISTS "invoices_delete_own_company" ON public.invoices;

-- invoice_lines
DROP POLICY IF EXISTS "invoice_lines_select_own_company" ON public.invoice_lines;
DROP POLICY IF EXISTS "invoice_lines_insert_own_company" ON public.invoice_lines;
DROP POLICY IF EXISTS "invoice_lines_update_own_company" ON public.invoice_lines;
DROP POLICY IF EXISTS "invoice_lines_delete_own_company" ON public.invoice_lines;

-- purchases
DROP POLICY IF EXISTS "purchases_select_own_company" ON public.purchases;
DROP POLICY IF EXISTS "purchases_insert_own_company" ON public.purchases;
DROP POLICY IF EXISTS "purchases_update_own_company" ON public.purchases;
DROP POLICY IF EXISTS "purchases_delete_own_company" ON public.purchases;

-- purchase_lines（存在する場合のみ）
DO $$ BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'purchase_lines') THEN
    EXECUTE 'DROP POLICY IF EXISTS "purchase_lines_select_own_company" ON public.purchase_lines';
    EXECUTE 'DROP POLICY IF EXISTS "purchase_lines_insert_own_company" ON public.purchase_lines';
    EXECUTE 'DROP POLICY IF EXISTS "purchase_lines_update_own_company" ON public.purchase_lines';
    EXECUTE 'DROP POLICY IF EXISTS "purchase_lines_delete_own_company" ON public.purchase_lines';
  END IF;
END $$;


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- RLS 有効化
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quote_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'purchase_lines') THEN
    EXECUTE 'ALTER TABLE public.purchase_lines ENABLE ROW LEVEL SECURITY';
  END IF;
END $$;


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 統一ポリシー適用: 自社データのみアクセス可能
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- ■ customers
CREATE POLICY "customers_select_own_company" ON public.customers FOR SELECT USING (company_id = public.get_my_company_id());
CREATE POLICY "customers_insert_own_company" ON public.customers FOR INSERT WITH CHECK (company_id = public.get_my_company_id());
CREATE POLICY "customers_update_own_company" ON public.customers FOR UPDATE USING (company_id = public.get_my_company_id());
CREATE POLICY "customers_delete_own_company" ON public.customers FOR DELETE USING (company_id = public.get_my_company_id());

-- ■ suppliers
CREATE POLICY "suppliers_select_own_company" ON public.suppliers FOR SELECT USING (company_id = public.get_my_company_id());
CREATE POLICY "suppliers_insert_own_company" ON public.suppliers FOR INSERT WITH CHECK (company_id = public.get_my_company_id());
CREATE POLICY "suppliers_update_own_company" ON public.suppliers FOR UPDATE USING (company_id = public.get_my_company_id());
CREATE POLICY "suppliers_delete_own_company" ON public.suppliers FOR DELETE USING (company_id = public.get_my_company_id());

-- ■ products
CREATE POLICY "products_select_own_company" ON public.products FOR SELECT USING (company_id = public.get_my_company_id());
CREATE POLICY "products_insert_own_company" ON public.products FOR INSERT WITH CHECK (company_id = public.get_my_company_id());
CREATE POLICY "products_update_own_company" ON public.products FOR UPDATE USING (company_id = public.get_my_company_id());
CREATE POLICY "products_delete_own_company" ON public.products FOR DELETE USING (company_id = public.get_my_company_id());

-- ■ supplier_products
CREATE POLICY "supplier_products_select_own_company" ON public.supplier_products FOR SELECT USING (company_id = public.get_my_company_id());
CREATE POLICY "supplier_products_insert_own_company" ON public.supplier_products FOR INSERT WITH CHECK (company_id = public.get_my_company_id());
CREATE POLICY "supplier_products_update_own_company" ON public.supplier_products FOR UPDATE USING (company_id = public.get_my_company_id());
CREATE POLICY "supplier_products_delete_own_company" ON public.supplier_products FOR DELETE USING (company_id = public.get_my_company_id());

-- ■ orders
CREATE POLICY "orders_select_own_company" ON public.orders FOR SELECT USING (company_id = public.get_my_company_id());
CREATE POLICY "orders_insert_own_company" ON public.orders FOR INSERT WITH CHECK (company_id = public.get_my_company_id());
CREATE POLICY "orders_update_own_company" ON public.orders FOR UPDATE USING (company_id = public.get_my_company_id());
CREATE POLICY "orders_delete_own_company" ON public.orders FOR DELETE USING (company_id = public.get_my_company_id());

-- ■ order_lines
CREATE POLICY "order_lines_select_own_company" ON public.order_lines FOR SELECT USING (company_id = public.get_my_company_id());
CREATE POLICY "order_lines_insert_own_company" ON public.order_lines FOR INSERT WITH CHECK (company_id = public.get_my_company_id());
CREATE POLICY "order_lines_update_own_company" ON public.order_lines FOR UPDATE USING (company_id = public.get_my_company_id());
CREATE POLICY "order_lines_delete_own_company" ON public.order_lines FOR DELETE USING (company_id = public.get_my_company_id());

-- ■ quotes
CREATE POLICY "quotes_select_own_company" ON public.quotes FOR SELECT USING (company_id = public.get_my_company_id());
CREATE POLICY "quotes_insert_own_company" ON public.quotes FOR INSERT WITH CHECK (company_id = public.get_my_company_id());
CREATE POLICY "quotes_update_own_company" ON public.quotes FOR UPDATE USING (company_id = public.get_my_company_id());
CREATE POLICY "quotes_delete_own_company" ON public.quotes FOR DELETE USING (company_id = public.get_my_company_id());

-- ■ quote_lines
CREATE POLICY "quote_lines_select_own_company" ON public.quote_lines FOR SELECT USING (company_id = public.get_my_company_id());
CREATE POLICY "quote_lines_insert_own_company" ON public.quote_lines FOR INSERT WITH CHECK (company_id = public.get_my_company_id());
CREATE POLICY "quote_lines_update_own_company" ON public.quote_lines FOR UPDATE USING (company_id = public.get_my_company_id());
CREATE POLICY "quote_lines_delete_own_company" ON public.quote_lines FOR DELETE USING (company_id = public.get_my_company_id());

-- ■ invoices
CREATE POLICY "invoices_select_own_company" ON public.invoices FOR SELECT USING (company_id = public.get_my_company_id());
CREATE POLICY "invoices_insert_own_company" ON public.invoices FOR INSERT WITH CHECK (company_id = public.get_my_company_id());
CREATE POLICY "invoices_update_own_company" ON public.invoices FOR UPDATE USING (company_id = public.get_my_company_id());
CREATE POLICY "invoices_delete_own_company" ON public.invoices FOR DELETE USING (company_id = public.get_my_company_id());

-- ■ invoice_lines
CREATE POLICY "invoice_lines_select_own_company" ON public.invoice_lines FOR SELECT USING (company_id = public.get_my_company_id());
CREATE POLICY "invoice_lines_insert_own_company" ON public.invoice_lines FOR INSERT WITH CHECK (company_id = public.get_my_company_id());
CREATE POLICY "invoice_lines_update_own_company" ON public.invoice_lines FOR UPDATE USING (company_id = public.get_my_company_id());
CREATE POLICY "invoice_lines_delete_own_company" ON public.invoice_lines FOR DELETE USING (company_id = public.get_my_company_id());

-- ■ purchases
CREATE POLICY "purchases_select_own_company" ON public.purchases FOR SELECT USING (company_id = public.get_my_company_id());
CREATE POLICY "purchases_insert_own_company" ON public.purchases FOR INSERT WITH CHECK (company_id = public.get_my_company_id());
CREATE POLICY "purchases_update_own_company" ON public.purchases FOR UPDATE USING (company_id = public.get_my_company_id());
CREATE POLICY "purchases_delete_own_company" ON public.purchases FOR DELETE USING (company_id = public.get_my_company_id());

-- ■ purchase_lines（存在する場合のみ）
DO $$ BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'purchase_lines') THEN
    EXECUTE 'CREATE POLICY "purchase_lines_select_own_company" ON public.purchase_lines FOR SELECT USING (company_id = public.get_my_company_id())';
    EXECUTE 'CREATE POLICY "purchase_lines_insert_own_company" ON public.purchase_lines FOR INSERT WITH CHECK (company_id = public.get_my_company_id())';
    EXECUTE 'CREATE POLICY "purchase_lines_update_own_company" ON public.purchase_lines FOR UPDATE USING (company_id = public.get_my_company_id())';
    EXECUTE 'CREATE POLICY "purchase_lines_delete_own_company" ON public.purchase_lines FOR DELETE USING (company_id = public.get_my_company_id())';
  END IF;
END $$;


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- FC管理者用ポリシー（同一franchise配下の全社データ閲覧可能）
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- FC管理者がSELECTで全加盟店データを横断閲覧できるポリシー
-- 各テーブルに追加（注: INSERT/UPDATE/DELETEは自社のみ）

CREATE POLICY "orders_select_franchise_admin" ON public.orders FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid() AND p.is_franchise_admin = true
    )
    AND company_id IN (
        SELECT c.id FROM public.companies c
        WHERE c.franchise_id = public.get_my_franchise_id()
    )
);

CREATE POLICY "customers_select_franchise_admin" ON public.customers FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid() AND p.is_franchise_admin = true
    )
    AND company_id IN (
        SELECT c.id FROM public.companies c
        WHERE c.franchise_id = public.get_my_franchise_id()
    )
);

CREATE POLICY "invoices_select_franchise_admin" ON public.invoices FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid() AND p.is_franchise_admin = true
    )
    AND company_id IN (
        SELECT c.id FROM public.companies c
        WHERE c.franchise_id = public.get_my_franchise_id()
    )
);

CREATE POLICY "quotes_select_franchise_admin" ON public.quotes FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid() AND p.is_franchise_admin = true
    )
    AND company_id IN (
        SELECT c.id FROM public.companies c
        WHERE c.franchise_id = public.get_my_franchise_id()
    )
);

CREATE POLICY "purchases_select_franchise_admin" ON public.purchases FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid() AND p.is_franchise_admin = true
    )
    AND company_id IN (
        SELECT c.id FROM public.companies c
        WHERE c.franchise_id = public.get_my_franchise_id()
    )
);


SELECT 'Phase 1-3 完了: 全テーブルに統一RLSポリシー + FC管理者ポリシーを適用' AS result;
