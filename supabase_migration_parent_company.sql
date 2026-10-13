-- ============================================================
-- お客様 → FC先 紐づけ用マイグレーション
-- companies テーブルに parent_company_id を追加
-- お客様会社は必ずどこかのFC先に紐づく
-- ============================================================

-- 1. parent_company_id カラムを追加
ALTER TABLE public.companies
ADD COLUMN IF NOT EXISTS parent_company_id UUID REFERENCES public.companies(id);

-- 2. インデックス作成（FC先ごとのお客様検索を高速化）
CREATE INDEX IF NOT EXISTS idx_companies_parent_company_id
ON public.companies(parent_company_id);

-- 3. コメント追加
COMMENT ON COLUMN public.companies.parent_company_id IS 'お客様会社の場合、所属するFC先のcompany_id';
