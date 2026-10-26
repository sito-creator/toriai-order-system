BEGIN;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS track_inventory boolean NOT NULL DEFAULT false;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS tax_rate integer NOT NULL DEFAULT 10;
ALTER TABLE public.pos_sales DROP CONSTRAINT IF EXISTS pos_sales_payment_method_check;
ALTER TABLE public.pos_sales ADD CONSTRAINT pos_sales_payment_method_check CHECK(payment_method IN ('cash','card'));
ALTER TABLE public.pos_sales DROP CONSTRAINT IF EXISTS pos_sales_status_check;
ALTER TABLE public.pos_sales ADD CONSTRAINT pos_sales_status_check CHECK(status IN ('pending','paid','voided'));
ALTER TABLE public.pos_sales ADD COLUMN IF NOT EXISTS stripe_account_id text;
ALTER TABLE public.pos_sales ADD COLUMN IF NOT EXISTS stripe_session_id text;
ALTER TABLE public.pos_sales ADD COLUMN IF NOT EXISTS checkout_url text;
ALTER TABLE public.pos_sales ADD COLUMN IF NOT EXISTS paid_at timestamptz;
ALTER TABLE public.pos_sales ADD COLUMN IF NOT EXISTS inventory_reserved boolean NOT NULL DEFAULT false;
ALTER TABLE public.pos_sales ADD COLUMN IF NOT EXISTS inventory_lines jsonb NOT NULL DEFAULT '[]';
CREATE UNIQUE INDEX IF NOT EXISTS pos_sales_stripe_session ON public.pos_sales(stripe_session_id) WHERE stripe_session_id IS NOT NULL;

-- 在庫確保と売上保存は同じトランザクション。再送は売上IDで冪等化。
CREATE OR REPLACE FUNCTION public.pos_create_sale(p_sale jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE s public.pos_sales; p public.products; l jsonb; reserved jsonb := '[]'; q integer;
BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended(p_sale->>'id', 0));
 SELECT * INTO s FROM public.pos_sales WHERE id = (p_sale->>'id')::uuid;
 IF FOUND THEN
   IF s.company_id <> (p_sale->>'company_id')::uuid THEN RAISE EXCEPTION '会計IDが重複しています'; END IF;
   RETURN to_jsonb(s);
 END IF;
 FOR l IN SELECT value FROM jsonb_array_elements(p_sale->'lines') ORDER BY value->>'product_id' LOOP
   q := (l->>'quantity')::integer;
   IF q < 1 OR q > 999 THEN RAISE EXCEPTION '数量が不正です'; END IF;
   SELECT * INTO p FROM public.products WHERE id = (l->>'product_id')::uuid AND company_id = (p_sale->>'company_id')::uuid FOR UPDATE;
   IF NOT FOUND OR p.is_active = false THEN RAISE EXCEPTION '販売できない商品です'; END IF;
   IF COALESCE(NULLIF(p.standard_price,0),p.price,0) <> (l->>'price')::numeric OR p.tax_rate <> (l->>'tax_rate')::integer THEN RAISE EXCEPTION '商品価格・税率が更新されました。再読み込みしてください'; END IF;
   IF p.track_inventory THEN
     IF COALESCE(p.stock,0) < q THEN RAISE EXCEPTION '在庫不足: %', p.product_name; END IF;
     UPDATE public.products SET stock = stock - q WHERE id = p.id;
     reserved := reserved || jsonb_build_array(jsonb_build_object('product_id',p.id,'quantity',q));
   END IF;
 END LOOP;
 INSERT INTO public.pos_sales(id,company_id,created_by,lines,issuer,subtotal,tax,total,received,change,payment_method,status,stripe_account_id,inventory_reserved,inventory_lines,paid_at)
 VALUES((p_sale->>'id')::uuid,(p_sale->>'company_id')::uuid,(p_sale->>'created_by')::uuid,p_sale->'lines',p_sale->'issuer',(p_sale->>'subtotal')::integer,(p_sale->>'tax')::integer,(p_sale->>'total')::integer,(p_sale->>'received')::integer,(p_sale->>'change')::integer,p_sale->>'payment_method',p_sale->>'status',p_sale->>'stripe_account_id',true,reserved,CASE WHEN p_sale->>'status'='paid' THEN now() ELSE NULL END) RETURNING * INTO s;
 RETURN to_jsonb(s);
END $$;

CREATE OR REPLACE FUNCTION public.pos_transition(p_id uuid, p_company uuid, p_target text, p_reason text DEFAULT NULL, p_user uuid DEFAULT NULL) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE s public.pos_sales; l jsonb;
BEGIN
 SELECT * INTO s FROM public.pos_sales WHERE id=p_id AND company_id=p_company FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION '会計がありません'; END IF;
 IF s.status=p_target THEN RETURN to_jsonb(s); END IF;
 IF p_target='paid' THEN
   IF s.status<>'pending' THEN RAISE EXCEPTION '会計状態が変更されています'; END IF;
   UPDATE public.pos_sales SET status='paid',paid_at=now() WHERE id=s.id RETURNING * INTO s;
 ELSIF p_target='voided' THEN
   IF s.status='paid' AND s.payment_method='card' THEN RAISE EXCEPTION 'カード決済後の返金はStripeで行ってください'; END IF;
   IF s.inventory_reserved THEN
     FOR l IN SELECT value FROM jsonb_array_elements(s.inventory_lines) ORDER BY value->>'product_id' LOOP
       UPDATE public.products SET stock=COALESCE(stock,0)+(l->>'quantity')::integer WHERE id=(l->>'product_id')::uuid AND company_id=s.company_id;
     END LOOP;
   END IF;
   UPDATE public.pos_sales SET status='voided',inventory_reserved=false,void_reason=p_reason,voided_by=p_user,voided_at=now() WHERE id=s.id RETURNING * INTO s;
 ELSE RAISE EXCEPTION '不正な状態遷移'; END IF;
 RETURN to_jsonb(s);
END $$;
REVOKE ALL ON FUNCTION public.pos_cre