-- ============================================================
-- 招待URL経由の登録を「customer」ロールに変更するマイグレーション
-- ============================================================

-- 1. まず既存のCHECK制約を削除して、customerロールを追加した新しい制約を作成
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check 
CHECK (role IN ('owner', 'admin', 'member', 'customer'));

-- 2. 「すすぎ一郎」さんのロールを customer に修正
UPDATE public.profiles 
SET role = 'customer' 
WHERE email = 'cotact@mykigaku.com' AND role = 'member';

-- 3. handle_new_user() 関数を更新: invite_code経由 → customer ロール
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
    found_invite RECORD;
    found_company RECORD;
    new_company_id UUID;
    meta_invite_code TEXT;
    meta_display_name TEXT;
BEGIN
    -- メタデータから invite_code と display_name を取得
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
        
        -- 利用済みになった招待状を削除
        DELETE FROM public.company_invitations WHERE id = found_invite.id;
    ELSIF meta_invite_code IS NOT NULL AND meta_invite_code != '' THEN
        -- 2. invite_code がメタデータにある場合、その会社に「customer」として参加
        SELECT * INTO found_company FROM public.companies WHERE invite_code = meta_invite_code LIMIT 1;
        
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
