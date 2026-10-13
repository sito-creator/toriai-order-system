-- ============================================================
-- マルチテナント対応 Phase 1-1: franchises テーブル & companies 拡張
-- Supabase Dashboard の SQL Editor で実行してください
-- https://supabase.com/dashboard/project/egrrqzfyzukuhzsavuky/sql/new
-- ============================================================

-- ■ 1. franchises テーブル作成（FC本部管理）
CREATE TABLE IF NOT EXISTS public.franchises (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT NOT NULL,              -- FC名 (例: "○○チェーン 関東エリア")
    code        TEXT UNIQUE NOT NULL,       -- FC識別コード (例: "FC-KANTO-001")
    owner_name  TEXT,                       -- FC本部の管理者名
    contact_email TEXT,                     -- 連絡先メール
    phone       TEXT,
    notes       TEXT,                       -- 備考
    is_active   BOOLEAN DEFAULT true,
    created_at  TIMESTAMPTZ DEFAULT now(),
    updated_at  TIMESTAMPTZ DEFAULT now()
);

-- franchises テーブルの RLS
ALTER TABLE public.franchises ENABLE ROW LEVEL SECURITY;

-- 認証ユーザーは全FC情報を閲覧可能（管理画面用）
CREATE POLICY "Authenticated users can view franchises" ON public.franchises
    FOR SELECT USING (auth.uid() IS NOT NULL);


-- ■ 2. companies テーブル拡張
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS franchise_id UUID REFERENCES public.franchises(id);
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS company_code TEXT UNIQUE;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS plan_type TEXT DEFAULT 'standard';
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- franchise_id のインデックス
CREATE INDEX IF NOT EXISTS idx_companies_franchise ON public.companies(franchise_id);


-- ■ 3. profiles テーブル拡張（FC管理者フラグ）
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_franchise_admin BOOLEAN DEFAULT false;


-- ■ 4. ヘルパー関数: 現在のユーザーの company_id を返す
CREATE OR REPLACE FUNCTION public.get_my_company_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT company_id FROM public.profiles WHERE id = auth.uid()
$$;

-- ヘルパー関数: 現在のユーザーの franchise_id を返す
CREATE OR REPLACE FUNCTION public.get_my_franchise_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT c.franchise_id 
  FROM public.profiles p 
  JOIN public.companies c ON p.company_id = c.id 
  WHERE p.id = auth.uid()
$$;

SELECT 'Phase 1-1 完了: franchises テーブル作成、companies 拡張、ヘルパー関数作成' AS result;
