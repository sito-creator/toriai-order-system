-- ============================================================
-- テナント管理機能用 追加マイグレーション
-- Supabase Dashboard の SQL Editor で実行してください
-- ============================================================

-- ■ 1. companies テーブルに franchise_role と invite_code を追加
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS franchise_role TEXT DEFAULT 'member';
-- franchise_role: 'headquarters'(本部) or 'member'(加盟店)

ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS invite_code TEXT;
-- invite_code: 招待URL用のコード

-- ■ 2. franchises テーブルに owner_company_id を追加（FC本部の会社ID）
ALTER TABLE public.franchises ADD COLUMN IF NOT EXISTS owner_company_id UUID REFERENCES public.companies(id);

-- ■ 3. franchises.code を NULL可能に変更（自動生成するため）
ALTER TABLE public.franchises ALTER COLUMN code DROP NOT NULL;

-- ■ 4. profiles に is_system_admin を追加（SaaS運営者フラグ）
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_system_admin BOOLEAN DEFAULT false;

-- ■ 5. invite_code にインデックスを追加（招待URL検索用）
CREATE INDEX IF NOT EXISTS idx_companies_invite_code ON public.companies(invite_code);

-- ■ 6. MoMo（株式会社MoMo）のユーザーをシステム管理者に設定
UPDATE public.profiles 
SET is_system_admin = true 
WHERE company_id = '549cf119-1b5d-46ad-b55b-4e0bf08f427d';

SELECT 'テナント管理用マイグレーション完了（is_system_admin含む）' AS result;
