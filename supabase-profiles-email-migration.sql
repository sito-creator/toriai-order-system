-- ============================================================
-- profiles テーブルにメールアドレスを追加 & トリガー更新
-- ============================================================

-- 1. profiles テーブルに email カラムを追加
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS email TEXT;

-- 2. DBトリガーの更新: メール・表示名も profiles に保存する
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
    found_invite RECORD;
    found_company RECORD;
    new_company_id UUID;
    meta_invite_code TEXT;
    user_display_name TEXT;
BEGIN
    -- メタデータから invite_code と display_name を取得
    meta_invite_code := new.raw_user_meta_data->>'invite_code';
    user_display_name := new.raw_user_meta_data->>'display_name';
    
    -- display_name が空ならメールのローカルパートを使用
    IF user_display_name IS NULL OR user_display_name = '' THEN
        user_display_name := split_part(new.email, '@', 1);
    END IF;
    
    -- 1. まず、メールアドレス宛の招待状があるかチェック
    SELECT * INTO found_invite FROM public.company_invitations WHERE email = new.email LIMIT 1;
    
    IF FOUND THEN
        -- 招待されていた場合、その会社に指定された権限で所属させる
        INSERT INTO public.profiles (id, company_id, role, display_name, email)
        VALUES (new.id, found_invite.company_id, found_invite.role, user_display_name, new.email);
        
        -- 利用済みになった招待状を削除
        DELETE FROM public.company_invitations WHERE id = found_invite.id;
    ELSIF meta_invite_code IS NOT NULL AND meta_invite_code != '' THEN
        -- 2. invite_code がメタデータにある場合、その会社に参加
        SELECT * INTO found_company FROM public.companies WHERE invite_code = meta_invite_code LIMIT 1;
        
        IF FOUND THEN
            INSERT INTO public.profiles (id, company_id, role, display_name, email)
            VALUES (new.id, found_company.id, 'member', user_display_name, new.email);
        ELSE
            -- invite_code が無効な場合は新規会社作成
            INSERT INTO public.companies (name) VALUES ('新しい会社（設定から変更してください）') RETURNING id INTO new_company_id;
            INSERT INTO public.profiles (id, company_id, role, display_name, email)
            VALUES (new.id, new_company_id, 'owner', user_display_name, new.email);
        END IF;
    ELSE
        -- 3. 招待もinvite_codeも無い場合、新規に会社を作成してオーナーにする
        INSERT INTO public.companies (name) VALUES ('新しい会社（設定から変更してください）') RETURNING id INTO new_company_id;
        INSERT INTO public.profiles (id, company_id, role, display_name, email)
        VALUES (new.id, new_company_id, 'owner', user_display_name, new.email);
    END IF;
    
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. 既存ユーザーのメールアドレスを一括更新
UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE p.id = u.id AND p.email IS NULL;

-- 4. 既存ユーザーの表示名が無い場合、メールのローカルパートで補完
UPDATE public.profiles p
SET display_name = split_part(u.email, '@', 1)
FROM auth.users u
WHERE p.id = u.id AND (p.display_name IS NULL OR p.display_name = '');
