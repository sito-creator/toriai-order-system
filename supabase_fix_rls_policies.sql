-- ============================================================
-- RLS ポリシー修正SQL
-- Supabase Dashboard の SQL Editor で実行してください
-- https://supabase.com/dashboard/project/egrrqzfyzukuhzsavuky/sql/new
-- ============================================================

-- ■ companiesテーブル - UPDATEポリシー追加
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'companies' AND policyname = 'Users can update their own company'
    ) THEN
        EXECUTE 'CREATE POLICY "Users can update their own company" ON companies FOR UPDATE USING (id IN (SELECT company_id FROM profiles WHERE id = auth.uid()))';
    END IF;
END $$;

-- ■ ordersテーブル - UPDATE ポリシー追加
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'orders' AND policyname = 'Users can update orders'
    ) THEN
        EXECUTE 'CREATE POLICY "Users can update orders" ON orders FOR UPDATE USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()))';
    END IF;
END $$;

-- ■ order_linesテーブル - INSERT/UPDATE/DELETE ポリシー追加
DO $$
BEGIN
    -- SELECT
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'order_lines' AND policyname = 'Users can view order lines'
    ) THEN
        EXECUTE 'CREATE POLICY "Users can view order lines" ON order_lines FOR SELECT USING (order_id IN (SELECT id FROM orders WHERE company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())))';
    END IF;

    -- INSERT
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'order_lines' AND policyname = 'Users can insert order lines'
    ) THEN
        EXECUTE 'CREATE POLICY "Users can insert order lines" ON order_lines FOR INSERT WITH CHECK (order_id IN (SELECT id FROM orders WHERE company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())))';
    END IF;

    -- UPDATE
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'order_lines' AND policyname = 'Users can update order lines'
    ) THEN
        EXECUTE 'CREATE POLICY "Users can update order lines" ON order_lines FOR UPDATE USING (order_id IN (SELECT id FROM orders WHERE company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())))';
    END IF;

    -- DELETE
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'order_lines' AND policyname = 'Users can delete order lines'
    ) THEN
        EXECUTE 'CREATE POLICY "Users can delete order lines" ON order_lines FOR DELETE USING (order_id IN (SELECT id FROM orders WHERE company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())))';
    END IF;
END $$;

-- ■ order_linesテーブル - RLSが無効の場合は有効化
ALTER TABLE order_lines ENABLE ROW LEVEL SECURITY;
