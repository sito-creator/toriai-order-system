-- 検証用。売上・在庫変更は最後にすべてROLLBACKする。
BEGIN;
DO $$
DECLARE p public.products; u uuid; a uuid:=gen_random_uuid(); b uuid:=gen_random_uuid(); sale jsonb; n numeric; price numeric; tax integer;
BEGIN
 SELECT pr.* INTO p FROM public.products pr WHERE pr.is_active=true AND EXISTS(SELECT 1 FROM public.profiles pf WHERE pf.company_id=pr.company_id) LIMIT 1;
 IF NOT FOUND THEN RAISE EXCEPTION '検証可能な商品がありません'; END IF;
 SELECT id INTO u FROM public.profiles WHERE company_id=p.company_id LIMIT 1;
 UPDATE public.products SET stock=5,track_inventory=true WHERE id=p.id;
 price:=COALESCE(NULLIF(p.standard_price,0),p.price,0); tax:=floor(price*2*p.tax_rate/100);
 sale:=jsonb_build_object('id',a,'company_id',p.company_id,'created_by',u,'lines',jsonb_build_array(jsonb_build_object('product_id',p.id,'name',p.product_name,'price',price,'quantity',2,'tax_rate',p.tax_rate)),'issuer','{}'::jsonb,'subtotal',price*2,'tax',tax,'total',price*2+tax,'received',price*2+tax,'change',0,'payment_method','cash','status','paid');
 PERFORM public.pos_create_sale(sale);
 PERFORM public.pos_create_sale(sale);
 SELECT stock INTO n FROM public.products WHERE id=p.id;
 IF n<>3 THEN RAISE EXCEPTION '二重減算または減算失敗'; END IF;
 PERFORM public.pos_transition(a,p.company_id,'voided','動作確認',u);
 PERFORM public.pos_transition(a,p.company_id,'voided','再送',u);
 SELECT stock INTO n FROM public.products WHERE id=p.id;
 IF n<>5 THEN RAISE EXCEPTION '取消の復元失敗'; END IF;
 sale:=sale||jsonb_build_object('id',b,'payment_method','card','status','pending','stripe_account_id','test');
 PERFORM public.pos_create_sale(sale);
 PERFORM public.pos_transition(b,p.company_id,'paid');
 PERFORM public.pos_transition(b,p.company_id,'paid');
 SELECT stock INTO n FROM public.products WHERE id=p.id;
 IF n<>3 THEN RAISE EXCEPTION '支払完了の二重減算'; END IF;
 BEGIN
   PERFORM public.pos_transition(b,p.company_id,'voided');
   RAISE EXCEPTION 'カード支払済み取消を許可してしまった';
 EXCEPTION WHEN OTHERS THEN
   IF SQLERRM NOT LIKE 'カード決済後の返金%' THEN RAISE; END IF;
 END;
 BEGIN
   PERFORM public.pos_create_sale(sale||jsonb_build_object('id',gen_random_uuid(),'lines',jsonb_build_array(jsonb_build_object('product_id',p.id,'name',p.product_name,'price',price,'quantity',999,'tax_rate',p.tax_rate))));
   RAISE EXCEPTION '在庫不足を許可してしまった';
 EXCEPTION WHEN OTHERS THEN
   IF SQLERRM NOT LIKE '在庫不足:%' THEN RAISE; END IF;
 END;
 IF has_function_privilege('authenticated','public.pos_create_sale(jsonb)','EXECUTE') THEN RAISE EXCEPTION '一般ユーザーにRPC実行権限がある'; END IF;
END $$;
SELECT 'PASS: cash reservation, retry, void restore, card completion, duplicate completion, paid-card guard, insufficient stock, RPC permissions' AS result;
ROLLBACK;
