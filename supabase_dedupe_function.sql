-- 重複顧客削除関数（外部キー制約を考慮して関連データを付け替えてから削除）
-- SupabaseのSQL Editorで実行してください

CREATE OR REPLACE FUNCTION dedupe_customers_simple()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    deleted_count integer := 0;
    dup record;
    keeper_id uuid;
BEGIN
    -- 重複している会社名ごとに処理
    FOR dup IN
        SELECT company_name
        FROM customers
        GROUP BY company_name
        HAVING COUNT(*) > 1
    LOOP
        -- 最も古いレコードを残す（keeper）
        SELECT id INTO keeper_id
        FROM customers
        WHERE company_name = dup.company_name
        ORDER BY created_at ASC
        LIMIT 1;

        -- 関連テーブルの customer_id を keeper に付け替え
        UPDATE orders     SET customer_id = keeper_id WHERE customer_id IN (
            SELECT id FROM customers WHERE company_name = dup.company_name AND id <> keeper_id
        );
        UPDATE invoices   SET customer_id = keeper_id WHERE customer_id IN (
            SELECT id FROM customers WHERE company_name = dup.company_name AND id <> keeper_id
        );
        UPDATE quotes     SET customer_id = keeper_id WHERE customer_id IN (
            SELECT id FROM customers WHERE company_name = dup.company_name AND id <> keeper_id
        );

        -- keeper以外を削除
        DELETE FROM customers
        WHERE company_name = dup.company_name
          AND id <> keeper_id;

        GET DIAGNOSTICS deleted_count = deleted_count + ROW_COUNT;
    END LOOP;

    RETURN deleted_count;
END;
$$;
