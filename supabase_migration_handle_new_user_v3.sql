-- ============================================================
-- handle_new_user() 関数の更新（v3: invite_roleの明示的な処理）
-- ============================================================
-- 
-- 招待URLの分岐:
--   /invite/staff/[code]  → invite_role='staff'  → staff_invite_code で検索 → member
--   /invite/[code]        → invite_role='customer' → invite_code で検索 → customer
-- 
-- ※ このSQLをSupabase SQL Editorで実行してください
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
    found_invite RECORD;
    found_company RECORD;
    new_company_id UUID;
    meta_invite_code TEXT;
    meta_invite_role TEXT;
    meta_display_name TEXT;
    assigned_role TEXT;
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
        
        IF meta_invite_role = 'staff' THEN
            -- ★ スタッフ招待: staff_invite_code で検索 → member ロール
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

        IF meta_invite_role = 'customer' THEN
            -- ★ お客様招待: invite_code で検索 → customer ロール
            SELECT * INTO found_company FROM public.companies 
            WHERE invite_code = meta_invite_code LIMIT 1;
            
            IF FOUND THEN
                INSERT INTO public.profiles (id, company_id, role, display_name, email)
                VALUES (new.id, found_company.id, 'customer',
                        COALESCE(meta_display_name, split_part(new.email, '@', 1)),
                        new.email);
                RETURN new;
            END IF;
        END IF;
        
        -- invite_role が未指定の場合（レガシー対応）
        -- invite_code として検索し、見つかったら customer にする
        IF meta_invite_role IS NULL OR meta_invite_role = '' THEN
            SELECT * INTO found_company FROM public.companies 
            WHERE invite_code = meta_invite_code LIMIT 1;
            
            IF FOUND THEN
                INSERT INTO public.profiles (id, company_id, role, display_name, email)
                VALUES (new.id, found_company.id, 'customer',
                        COALESCE(meta_display_name, split_part(new.email, '@', 1)),
                        new.email);
                RETURN new;
            END IF;
        END IF;

        -- どのコードにもマッチしなかった場合は新規会社作成
        INSERT INTO public.companies (name) VALUES ('新しい会社（設定から変更してください）') RETURNING id INTO new_company_id;
        INSERT INTO public.profiles (id, company_id, role, display_name, email)
        VALUES (new.id, new_company_id, 'owner',
                COALESCE(meta_display_name, split_part(new.email, '@', 1)),
                new.email);
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

-- ============================================================
-- 菊池社長のロールを owner に修正
-- ============================================================
UPDATE public.profiles
SET role = 'owner'
WHERE email = '20200721.momo@gmail.com'
  AND role = 'member';

-- 確認
SELECT id, display_name, email, role, company_id
FROM public.profiles
WHERE email = '20200721.momo@gmail.com';
