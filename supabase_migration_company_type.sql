-- ============================================================
-- company_type カラム追加 + customer ロール廃止マイグレーション
-- ============================================================

-- 1. companies テーブルに company_type カラムを追加
ALTER TABLE public.companies 
ADD COLUMN IF NOT EXISTS company_type TEXT DEFAULT 'tenant';

-- 2. 既存データのcompany_typeを推定セット
-- franchise_role が headquarters の場合は headquarters
UPDATE public.companies 
SET company_type = 'headquarters'
WHERE franchise_role = 'headquarters';

-- 3. profiles の role CHECK制約を更新（customer を削除）
-- まず既存のcustomerロールをmemberに変更
UPDATE public.profiles SET role = 'member' WHERE role = 'customer';

-- CHECK制約を再作成
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check 
CHECK (role IN ('owner', 'admin', 'member'));

-- 4. handle_new_user() 関数を更新（customer ロール割当を廃止）
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
    found_invite RECORD;
    found_company RECORD;
    new_company_id UUID;
    meta_invite_code TEXT;
    meta_display_name TEXT;
BEGIN
    -- メタデータから招待情報を取得
    meta_invite_code := new.raw_user_meta_data->>'invite_code';
    meta_display_name := new.raw_user_meta_data->>'display_name';
    
    -- 1. まず、メールアドレス宛の招待状があるかチェック
    SELECT * INTO found_invite FROM public.company_invitations WHERE email = new.email LIMIT 1;
    
    IF FOUND THEN
        -- 招待されていた場合、その会社に指定された権限で所属させる
        INSERT INTO public.profiles (id, company_id, role, display_name, email)
        VALUES (new.id, found_invite.company_id, found_invite.role, 
                COALESCE(meta_display_name, split_part(new.email, '@', 1)), 
                new.email);
        DELETE FROM public.company_invitations WHERE id = found_invite.id;

    ELSIF meta_invite_code IS NOT NULL AND meta_invite_code != '' THEN
        -- 2. invite_code がメタデータにある場合
        
        -- staff_invite_code として検索（スタッフ招待 → member）
        SELECT * INTO found_company FROM public.companies 
        WHERE staff_invite_code = meta_invite_code LIMIT 1;
        
        IF FOUND THEN
            INSERT INTO public.profiles (id, company_id, role, display_name, email)
            VALUES (new.id, found_company.id, 'member',
                    COALESCE(meta_display_name, split_part(new.email, '@', 1)),
                    new.email);
            RETURN new;
        END IF;
        
        -- invite_code として検索（管理者招待 → owner）
        SELECT * INTO found_company FROM public.companies 
        WHERE invite_code = meta_invite_code LIMIT 1;
        
        IF FOUND THEN
            INSERT INTO public.profiles (id, company_id, role, display_name, email)
            VALUES (new.id, found_company.id, 'owner',
                    COALESCE(meta_display_name, split_part(new.email, '@', 1)),
                    new.email);
        ELSE
            -- invite_code が無効な場合は新規会社作成
            INSERT INTO public.companies (name, company_type) 
            VALUES ('新しい会社（設定から変更してください）', 'tenant') 
            RETURNING id INTO new_company_id;
            INSERT INTO public.profiles (id, company_id, role, display_name, email)
            VALUES (new.id, new_company_id, 'owner',
                    COALESCE(meta_display_name, split_part(new.email, '@', 1)),
                    new.email);
        END IF;
    ELSE
        -- 3. 招待もinvite_codeも無い場合、新規に会社を作成してオーナーにする
        INSERT INTO public.companies (name, company_type) 
        VALUES ('新しい会社（設定から変更してください）', 'tenant') 
        RETURNING id INTO new_company_id;
        INSERT INTO public.profiles (id, company_id, role, display_name, email)
        VALUES (new.id, new_company_id, 'owner',
                COALESCE(meta_display_name, split_part(new.email, '@', 1)),
                new.email);
    END IF;
    
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. 菊池社長のロールをownerに修正（最初のユーザーがmemberになっている場合の修正）
-- ※ メールアドレスを確認して適宜修正してください
-- UPDATE public.profiles SET role = 'owner' WHERE email = '菊池社長のメールアドレス';
