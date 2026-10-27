-- No persisted test sales: all changes roll back.
begin;
do $$
declare p public.products; u uuid; a uuid:=gen_random_uuid(); b uuid:=gen_random_uuid(); c uuid:=gen_random_uuid();
  sale jsonb; oid uuid; price numeric; tax numeric; n numeric;
begin
  select pr.* into p from products pr where pr.is_active=true and coalesce(nullif(pr.standard_price,0),pr.price,0)>0
    and exists(select 1 from profiles pf where pf.company_id=pr.company_id) limit 1;
  if not found then raise exception 'No test product'; end if;
  select id into u from profiles where company_id=p.company_id limit 1;
  update products set stock=10,track_inventory=true where id=p.id;
  price:=coalesce(nullif(p.standard_price,0),p.price,0); tax:=floor(price*2*p.tax_rate/100);
  sale:=jsonb_build_object('id',a,'company_id',p.company_id,'created_by',u,'lines',jsonb_build_array(
    jsonb_build_object('product_id',p.id,'name','snapshot A','price',price,'quantity',1,'tax_rate',p.tax_rate),
    jsonb_build_object('product_id',p.id,'name','snapshot B','price',price,'quantity',1,'tax_rate',p.tax_rate)),
    'issuer','{}'::jsonb,'subtotal',price*2,'tax',tax,'total',price*2+tax,'received',price*2+tax,'change',0,'payment_method','cash','status','paid');
  perform pos_create_sale(sale); perform pos_create_sale(sale);
  update pos_sales set status=status where id=a;
  if (select count(*) from orders where pos_sale_id=a)<>1 then raise exception 'Duplicate/missing order'; end if;
  select id into oid from orders where pos_sale_id=a and company_id=p.company_id and status='納品済' and total_amount=price*2+tax;
  if oid is null then raise exception 'Order header mismatch'; end if;
  if (select count(*) from order_lines where order_id=oid)<>2 then raise exception 'Duplicate/missing lines'; end if;
  if (select sum(tax_amount) from order_lines where order_id=oid)<>tax then raise exception 'Rounding mismatch'; end if;
  if (select stock from products where id=p.id)<>8 then raise exception 'Double inventory reservation'; end if;
  perform pos_transition(a,p.company_id,'voided','test',u); perform pos_transition(a,p.company_id,'voided','retry',u);
  if (select status from orders where id=oid)<>'取消済' then raise exception 'Void not synchronized'; end if;
  if (select stock from products where id=p.id)<>10 then raise exception 'Void inventory mismatch'; end if;
  if (select count(*) from order_lines where order_id=oid)<>2 then raise exception 'Void lost audit details'; end if;
  sale:=sale||jsonb_build_object('id',b,'payment_method','card','status','pending','stripe_account_id','test');
  perform pos_create_sale(sale);
  if exists(select 1 from orders where pos_sale_id=b) then raise exception 'Pending included'; end if;
  perform pos_transition(b,p.company_id,'paid'); perform pos_transition(b,p.company_id,'paid');
  if (select count(*) from orders where pos_sale_id=b and status='納品済')<>1 then raise exception 'Card completion duplicate'; end if;
  perform pos_create_sale(sale||jsonb_build_object('id',c));
  perform pos_transition(c,p.company_id,'voided','expired',u);
  if exists(select 1 from orders where pos_sale_id=c) then raise exception 'Unpaid void included'; end if;
  if (select sum(total_amount) from orders where pos_sale_id in(a,b,c) and status='納品済')<>price*2+tax then raise exception 'Double sales'; end if;
  perform set_config('test.pos_order_id',oid::text,true);
  perform set_config('test.pos_company_id',p.company_id::text,true);
  perform set_config('request.jwt.claims',jsonb_build_object('sub',u,'role','authenticated')::text,true);
end $$;
set local role authenticated;
do $$ begin
  begin
    update orders set total_amount=1 where id=current_setting('test.pos_order_id')::uuid;
    raise exception 'Read-only protection failed';
  exception when others then
    if sqlerrm not like 'POS連携受注%' then raise; end if;
  end;
  begin
    delete from order_lines where order_id=current_setting('test.pos_order_id')::uuid;
    raise exception 'Line protection failed';
  exception when others then
    if sqlerrm not like 'POS連携受注%' then raise; end if;
  end;
end $$;
reset role;
select 'PASS: POS order sync, retry/backfill deduplication, tax rounding, void sync, inventory, pending exclusion, card completion, read-only guards' as result;
rollback;
