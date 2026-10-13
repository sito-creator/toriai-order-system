-- ============================================================
-- 会社招待URL（invite_code）機能のマイグレーション
-- ============================================================

-- 1. companies テーブルに invite_code カラムを追加
ALTER TABLE public.companies 
ADD COLUMN IF NOT EXISTS invite_code TEXT UNIQUE DEFAULT encode(gen_random_bytes(8), 'hex');

-- 既存の会社にもinvite_codeが無ければ生成
UPDATE public.companies 
SET invite_code = encode(gen_random_bytes(8), 'hex') 
WHERE invite_code IS NULL;

-- 2. invite_code で会社を検索できるようにRLSポリシーを追加
-- （未認証ユーザーがinvite_codeで会社名を取得できるようにする）
CREATE POLICY "Anyone can read company by invite_code" ON public.companies
    FOR SELECT
    USING (true);

-- 3. DBトリガーの更新: メタデータの invite_code を確認して会社に自動参加
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
    found_invite RECORD;
    found_company RECORD;
    new_company_id UUID;
    meta_invite_code TEXT;
BEGIN
    -- メタデータから invite_code を取得
    meta_invite_code := new.raw_user_meta_data->>'invite_code';
    
    -- 1. まず、メールアドレス宛の招待状があるかチェック
    SELECT * INTO found_invite FROM public.company_invitations WHERE email = new.email LIMIT 1;
    
    IF FOUND THEN
        -- 招待されていた場合、その会社に指定された権限で所属させる
        INSERT INTO public.profiles (id, company_id, role)
        VALUES (new.id, found_invite.company_id, found_invite.role);
        
        -- 利用済みになった招待状を削除
        DELETE FROM public.company_invitations WHERE id = found_invite.id;
    ELSIF meta_invite_code IS NOT NULL AND meta_invite_code != '' THEN
        -- 2. invite_code がメタデータにある場合、その会社に参加
        SELECT * INTO found_company FROM public.companies WHERE invite_code = meta_invite_code LIMIT 1;
        
        IF FOUND THEN
            INSERT INTO public.profiles (id, company_id, role)
            VALUES (new.id, found_company.id, 'member');
        ELSE
            -- invite_code が無効な場合は新規会社作成
            INSERT INTO public.companies (name) VALUES ('新しい会社（設定から変更してください）') RETURNING id INTO new_company_id;
            INSERT INTO public.profiles (id, company_id, role)
            VALUES (new.id, new_company_id, 'owner');
        END IF;
    ELSE
        -- 3. 招待もinvite_codeも無い場合、新規に会社を作成してオーナーにする
        INSERT INTO public.companies (name) VALUES ('新しい会社（設定から変更してください）') RETURNING id INTO new_company_id;
        INSERT INTO public.profiles (id, company_id, role)
        VALUES (new.id, new_company_id, 'owner');
    END IF;
    
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
