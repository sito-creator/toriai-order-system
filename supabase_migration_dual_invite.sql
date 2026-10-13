-- ============================================================
-- スタッフ招待URLとお客様招待URLの分離マイグレーション
-- ============================================================

-- 1. companies テーブルに staff_invite_code カラムを追加
ALTER TABLE public.companies 
ADD COLUMN IF NOT EXISTS staff_invite_code TEXT UNIQUE;

-- 2. 既存のinvite_codeがある会社に staff_invite_code も生成
UPDATE public.companies 
SET staff_invite_code = substr(md5(random()::text || clock_timestamp()::text), 1, 12)
WHERE invite_code IS NOT NULL AND staff_invite_code IS NULL;

-- 3. handle_new_user() 関数を更新
-- invite_code → customer ロール（お客様招待）
-- staff_invite_code → member ロール（スタッフ招待）
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
    found_invite RECORD;
    found_company RECORD;
    new_company_id UUID;
    meta_invite_code TEXT;
    meta_invite_role TEXT;
    meta_display_name TEXT;
BEGIN
    -- メタデータから招待情報を取得
    meta_invite_code := new.raw_user_meta_data->>'invite_code';
    meta_invite_role := new.raw_user_meta_data->>'invite_role';
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
        
        -- まず staff_invite_code として検索（スタッフ招待 → member）
        IF meta_invite_role = 'staff' THEN
            SELECT * INTO found_company FROM public.companies 
            WHERE staff_invite_code = meta_invite_code LIMIT 1;
            
            IF FOUND THEN
                INSERT INTO public.profiles (id, company_id, role, display_name, email)
                VALUES (new.id, found_company.id, 'member',
                        COALESCE(meta_display_name, split_part(new.email, '@', 1)),
                        new.email);
                RETURN new;
            END IF;
        END IF;
        
        -- invite_code として検索（お客様招待 → customer）
        SELECT * INTO found_company FROM public.companies 
        WHERE invite_code = meta_invite_code LIMIT 1;
        
        IF FOUND THEN
            INSERT INTO public.profiles (id, company_id, role, display_name, email)
            VALUES (new.id, found_company.id, 'customer',
                    COALESCE(meta_display_name, split_part(new.email, '@', 1)),
                    new.email);
        ELSE
            -- invite_code が無効な場合は新規会社作成
            INSERT INTO public.companies (name) VALUES ('新しい会社（設定から変更してください）') RETURNING id INTO new_company_id;
            INSERT INTO public.profiles (id, company_id, role, display_name, email)
            VALUES (new.id, new_company_id, 'owner',
                    COALESCE(meta_display_name, split_part(new.email, '@', 1)),
                    new.email);
        END IF;
    ELSE
        -- 3. 招待もinvite_codeも無い場合、新規に会社を作成してオーナーにする
        INSERT INTO public.companies (name) VALUES ('新しい会社（設定から変更してください）') RETURNING id INTO new_company_id;
        INSERT INTO public.profiles (id, company_id, role, display_name, email)
        VALUES (new.id, new_company_id, 'owner',
                COALESCE(meta_display_name, split_part(new.email, '@', 1)),
                new.email);
    END IF;
    
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. CHECK制約の確認（customerが含まれているか）
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conrelid = 'public.profiles'::regclass 
        AND conname = 'profiles_role_check'
        AND pg_get_constraintdef(oid) LIKE '%customer%'
    ) THEN
        ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
        ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check 
        CHECK (role IN ('owner', 'admin', 'member', 'customer'));
    END IF;
END;
$$;
