-- 請求書のクレジットカード決済URL（Stripe Checkout Session）
CREATE TABLE IF NOT EXISTS public.invoice_payment_links (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
    provider text NOT NULL DEFAULT 'stripe' CHECK (provider IN ('stripe', 'square')),
    provider_payment_id text NOT NULL UNIQUE,
    provider_account_id text,
    payment_url text NOT NULL,
    amount bigint NOT NULL CHECK (amount > 0),
    currency text NOT NULL DEFAULT 'jpy',
    status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paid', 'expired', 'disabled')),
    expires_at timestamptz,
    paid_at timestamptz,
    created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invoice_payment_links_invoice
    ON public.invoice_payment_links(invoice_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_invoice_payment_links_company
    ON public.invoice_payment_links(company_id);

ALTER TABLE public.invoice_payment_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "invoice_payment_links_select_own_company" ON public.invoice_payment_links;
DROP POLICY IF EXISTS "invoice_payment_links_insert_own_company" ON public.invoice_payment_links;
DROP POLICY IF EXISTS "invoice_payment_links_update_own_company" ON public.invoice_payment_links;
DROP POLICY IF EXISTS "invoice_payment_links_delete_own_company" ON public.invoice_payment_links;

CREATE POLICY "invoice_payment_links_select_own_company"
    ON public.invoice_payment_links FOR SELECT
    USING (company_id = public.get_my_company_id());
CREATE POLICY "invoice_payment_links_insert_own_company"
    ON public.invoice_payment_links FOR INSERT
    WITH CHECK (company_id = public.get_my_company_id());
CREATE POLICY "invoice_payment_links_update_own_company"
    ON public.invoice_payment_links FOR UPDATE
    USING (company_id = public.get_my_company_id())
    WITH CHECK (company_id = public.get_my_company_id());
CREATE POLICY "invoice_payment_links_delete_own_company"
    ON public.invoice_payment_links FOR DELETE
    USING (company_id = public.get_my_company_id());

COMMENT ON TABLE public.invoice_payment_links IS '請求書ごとの外部決済URLと決済状態';

-- 会社ごとのStripe Connect接続先。APIキーやOAuthアクセストークンは保存しない。
CREATE TABLE IF NOT EXISTS public.company_payment_integrations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    provider text NOT NULL DEFAULT 'stripe' CHECK (provider IN ('stripe', 'square')),
    provider_account_id text NOT NULL,
    account_name text,
    account_email text,
    livemode boolean NOT NULL DEFAULT false,
    status text NOT NULL DEFAULT 'connected' CHECK (status IN ('connected', 'disconnected', 'error')),
    connected_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    connected_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (company_id, provider)
);

CREATE INDEX IF NOT EXISTS idx_company_payment_integrations_company
    ON public.company_payment_integrations(company_id);

ALTER TABLE public.company_payment_integrations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "company_payment_integrations_select_own_company" ON public.company_payment_integrations;
DROP POLICY IF EXISTS "company_payment_integrations_insert_own_company" ON public.company_payment_integrations;
DROP POLICY IF EXISTS "company_payment_integrations_update_own_company" ON public.company_payment_integrations;
DROP POLICY IF EXISTS "company_payment_integrations_delete_own_company" ON public.company_payment_integrations;

CREATE POLICY "company_payment_integrations_select_own_company"
    ON public.company_payment_integrations FOR SELECT
    USING (company_id = public.get_my_company_id());
CREATE POLICY "company_payment_integrations_insert_own_company"
    ON public.company_payment_integrations FOR INSERT
    WITH CHECK (company_id = public.get_my_company_id());
CREATE POLICY "company_payment_integrations_update_own_company"
    ON public.company_payment_integrations FOR UPDATE
    USING (company_id = public.get_my_company_id())
    WITH CHECK (company_id = public.get_my_company_id());
CREATE POLICY "company_payment_integrations_delete_own_company"
    ON public.company_payment_integrations FOR DELETE
    USING (company_id = public.get_my_company_id());

COMMENT ON TABLE public.company_payment_integrations IS '会社単位の外部決済サービス接続情報（秘密鍵は保存しない）';
