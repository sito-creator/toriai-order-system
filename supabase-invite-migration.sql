-- 1. 会社への招待状テーブルの作成
CREATE TABLE IF NOT EXISTS public.company_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'member')),
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(company_id, email)
);

-- RLS設定
ALTER TABLE public.company_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "自分と同じ会社の招待だけ管理できる" ON public.company_invitations
    FOR ALL
    USING (company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()));


-- 2. 新規ユーザー登録時の自動処理（トリガー関数）をアップデート
-- 新しいユーザーがメールアドレスでサインアップした時、招待状があればその会社に所属させ、無ければ新しい会社を作成します。
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
    found_invite RECORD;
    new_company_id UUID;
BEGIN
    -- このメールアドレス宛の招待状があるかチェック
    SELECT * INTO found_invite FROM public.company_invitations WHERE email = new.email LIMIT 1;
    
    IF FOUND THEN
        -- 招待されていた場合、その会社に指定された権限で所属させる
        INSERT INTO public.profiles (id, company_id, role)
        VALUES (new.id, found_invite.company_id, found_invite.role);
        
        -- 利用済みになった招待状を削除
        DELETE FROM public.company_invitations WHERE id = found_invite.id;
    ELSE
        -- 招待されていなかった場合、新規に会社を作成してオーナーにする
        INSERT INTO public.companies (name) VALUES ('新しい会社（設定から変更してください）') RETURNING id INTO new_company_id;
        
        INSERT INTO public.profiles (id, company_id, role)
        VALUES (new.id, new_company_id, 'owner');
    END IF;
    
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
