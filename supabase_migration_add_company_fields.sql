-- company_settings テーブルに追加カラムを作成
-- Supabase Dashboard の SQL Editor で実行してください
-- https://supabase.com/dashboard/project/egrrqzfyzukuhzsavuky/sql/new

ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS representative_name TEXT;
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS registration_number TEXT;
