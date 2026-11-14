-- New purchase lines are private to the authenticated company from creation.
-- Existing financial records and legacy quote taxes are not rewritten.
begin;
create table if not exists public.purchase_lines (
 id uuid primary key default gen_random_uuid(),
 company_id uuid not null references public.companies(id),
 purchase_id uuid not null references public.purchases(id) on delete cascade,
 line_no integer not null,
 supplier_product_id uuid references public.supplier_products(id) on delete set null,
 product_name text not null,
 quantity numeric not null check(quantity>0),
 unit text,
 unit_price numeric not null check(unit_price>=0),
 amount numeric not null,
 tax_rate numeric not null check(tax_rate in (0,8,10)),
 tax_amount numeric not null,
 created_at timestamptz not null default now(),
 unique(purchase_id,line_no)
);
alter table public.purchase_lines enable row level security;
drop policy if exists purchase_lines_own_company on public.purchase_lines;
create policy purchase_lines_own_company on public.purchase_lines for all to authenticated
 using (company_id=public.get_my_company_id() and exists(select 1 from public.purchases p where p.id=purchase_id and p.company_id=public.get_my_company_id()))
 with check (company_id=public.get_my_company_id() and exists(select 1 from public.purchases p where p.id=purchase_id and p.company_id=public.get_my_company_id())
 and (supplier_product_id is null or exists(select 1 from public.supplier_products sp where sp.id=supplier_product_id and sp.company_id=public.get_my_company_id())));
revoke all on public.purchase_lines from public,anon;
grant select,insert,update,delete on public.purchase_lines to authenticated;
create index if not exists purchase_lines_company_idx on public.purchase_lines(company_id);
-- NULL means an old quote did not record this information. Never invent 10%.
alter table public.quote_lines add column if not exists product_id uuid references public.products(id) on delete set null,
 add column if not exists tax_rate numeric,
 add column if not exists tax_amount numeric,
 add column if not exists unit text,
 add column if not exists delivery_date date;
create or replace function public.create_purchase_with_lines(p_header jsonb,p_lines jsonb) returns uuid
 language plpgsql security invoker set search_path='' as $$
 declare
 v_company uuid := public.get_my_company_id();
 v_id uuid;
 v_line jsonb;
 v_product uuid;
 v_supplier uuid;
 v_qty numeric; v_price numeric; v_rate numeric; v_amount numeric; v_tax numeric;
 v_total numeric := 0; v_no integer := 0;
 begin

 if auth.uid() is null or v_company is null then raise exception '所属会社を確認できません'; end if;
 if jsonb_typeof(p_lines) is distinct from 'array' or jsonb_array_length(p_lines)=0 then raise exception '明細を1行以上入力してください'; end if;

 v_supplier := nullif(p_header->>'supplier_id','')::uuid;
 if v_supplier is not null and not exists(select 1 from public.suppliers where id=v_supplier and company_id=v_company) then raise exception '仕入先を確認できません'; end if;
 for v_line in select value from jsonb_array_elements(p_lines) loop
  v_product := nullif(v_line->>'supplier_product_id','')::uuid;
  if v_product is not null and not exists(select 1 from public.supplier_products where id=v_product and company_id=v_company and (v_supplier is null or supplier_id=v_supplier)) then raise exception '仕入先と商品を確認してください'; end if;

  v_qty := (v_line->>'quantity')::numeric;
  v_price := (v_line->>'unit_price')::numeric;
  v_rate := (v_line->>'tax_rate')::numeric;
  if v_qty is null or v_qty<=0 or v_qty::text in ('NaN','Infinity','-Infinity')
    or v_price is null or v_price<0 or v_price::text in ('NaN','Infinity','-Infinity')
    or v_rate is null or v_rate not in (0,8,10) then raise exception '数量・単価・税率を確認してください'; end if;
  if nullif(trim(v_line->>'product_name'),'') is null then raise exception '商品名を確認してください'; end if;
  v_amount := v_qty*v_price;
  v_tax := floor(v_amount*v_rate/100);
  v_total := v_total+v_amount+v_tax;
 end loop;
 insert into public.purchases(company_id,purchase_number,supplier_id,purchase_date,expected_delivery_date,status,total_amount)
 values(v_company,p_header->>'purchase_number',v_supplier,nullif(p_header->>'purchase_date','')::date,nullif(p_header->>'expected_delivery_date','')::date,'下書き',v_total) returning id into v_id;
 for v_line in select value from jsonb_array_elements(p_lines) loop

  v_qty := (v_line->>'quantity')::numeric;
  v_price := (v_line->>'unit_price')::numeric;
  v_rate := (v_line->>'tax_rate')::numeric;
  if v_qty is null or v_qty<=0 or v_qty::text in ('NaN','Infinity','-Infinity')
    or v_price is null or v_price<0 or v_price::text in ('NaN','Infinity','-Infinity')
    or v_rate is null or v_rate not in (0,8,10) then raise exception '数量・単価・税率を確認してください'; end if;
  if nullif(trim(v_line->>'product_name'),'') is null then raise exception '商品名を確認してください'; end if;
  v_amount := v_qty*v_price;
  v_tax := floor(v_amount*v_rate/100);

  v_no := v_no+1;
  insert into public.purchase_lines(company_id,purchase_id,line_no,supplier_product_id,product_name,quantity,unit,unit_price,amount,tax_rate,tax_amount)
  values(v_company,v_id,v_no,nullif(v_line->>'supplier_product_id','')::uuid,v_line->>'product_name',v_qty,v_line->>'unit',v_price,v_amount,v_rate,v_tax);
 end loop;
 return v_id;
 end; $$;
 revoke all on function public.create_purchase_with_lines(jsonb,jsonb) from public,anon;
 grant execute on function public.create_purchase_with_lines(jsonb,jsonb) to authenticated;
create or replace function public.create_document_with_lines(p_kind text,p_header jsonb,p_lines jsonb) returns uuid
 language plpgsql security invoker set search_path='' as $$
 declare
 v_company uuid := public.get_my_company_id();
 v_id uuid;
 v_line jsonb;
 v_product uuid;
 v_supplier uuid;
 v_qty numeric; v_price numeric; v_rate numeric; v_amount numeric; v_tax numeric;
 v_total numeric := 0; v_no integer := 0;
 begin

 if auth.uid() is null or v_company is null then raise exception '所属会社を確認できません'; end if;
 if jsonb_typeof(p_lines) is distinct from 'array' or jsonb_array_length(p_lines)=0 then raise exception '明細を1行以上入力してください'; end if;

 if p_kind is null or p_kind not in ('quote','invoice') then raise exception '書類種別を確認してください'; end if;
 if not exists(select 1 from public.customers where id=(p_header->>'customer_id')::uuid and company_id=v_company) then raise exception '取引先を確認してください'; end if;
 for v_line in select value from jsonb_array_elements(p_lines) loop
  v_product := nullif(v_line->>'product_id','')::uuid;
  if v_product is not null and not exists(select 1 from public.products where id=v_product and company_id=v_company) then raise exception '商品を確認してください'; end if;

  v_qty := (v_line->>'quantity')::numeric;
  v_price := (v_line->>'unit_price')::numeric;
  v_rate := (v_line->>'tax_rate')::numeric;
  if v_qty is null or v_qty<=0 or v_qty::text in ('NaN','Infinity','-Infinity')
    or v_price is null or v_price<0 or v_price::text in ('NaN','Infinity','-Infinity')
    or v_rate is null or v_rate not in (0,8,10) then raise exception '数量・単価・税率を確認してください'; end if;
  if nullif(trim(v_line->>'product_name'),'') is null then raise exception '商品名を確認してください'; end if;
  v_amount := v_qty*v_price;
  v_tax := floor(v_amount*v_rate/100);
  v_total := v_total+v_amount+v_tax;
 end loop;
 if p_kind='quote' then
  insert into public.quotes(company_id,quote_number,customer_id,subject,total_amount,status,valid_until)
  values(v_company,p_header->>'quote_number',(p_header->>'customer_id')::uuid,p_header->>'subject',v_total,'下書き',nullif(p_header->>'valid_until','')::date) returning id into v_id;
 else
  insert into public.invoices(company_id,invoice_number,customer_id,issue_date,due_date,total_amount,status)
  values(v_company,p_header->>'invoice_number',(p_header->>'customer_id')::uuid,nullif(p_header->>'issue_date','')::date,nullif(p_header->>'due_date','')::date,v_total,'下書き') returning id into v_id;
 end if;
 for v_line in select value from jsonb_array_elements(p_lines) loop

  v_qty := (v_line->>'quantity')::numeric;
  v_price := (v_line->>'unit_price')::numeric;
  v_rate := (v_line->>'tax_rate')::numeric;
  if v_qty is null or v_qty<=0 or v_qty::text in ('NaN','Infinity','-Infinity')
    or v_price is null or v_price<0 or v_price::text in ('NaN','Infinity','-Infinity')
    or v_rate is null or v_rate not in (0,8,10) then raise exception '数量・単価・税率を確認してください'; end if;
  if nullif(trim(v_line->>'product_name'),'') is null then raise exception '商品名を確認してください'; end if;
  v_amount := v_qty*v_price;
  v_tax := floor(v_amount*v_rate/100);

  v_no := v_no+1;
  if p_kind='quote' then
   insert into public.quote_lines(company_id,quote_id,line_no,product_id,item_name,quantity,unit_price,amount,tax_rate,tax_amount,unit,delivery_date)
   values(v_company,v_id,v_no,nullif(v_line->>'product_id','')::uuid,v_line->>'product_name',v_qty,v_price,v_amount,v_rate,v_tax,v_line->>'unit',nullif(v_line->>'delivery_date','')::date);
  else
   insert into public.invoice_lines(company_id,invoice_id,line_no,item_name,quantity,unit_price,amount,tax_rate,tax_amount,unit,delivery_date)
   values(v_company,v_id,v_no,v_line->>'product_name',v_qty,v_price,v_amount,v_rate,v_tax,v_line->>'unit',nullif(v_line->>'delivery_date','')::date);
  end if;
 end loop;
 return v_id;
 end; $$;
 revoke all on function public.create_document_with_lines(text,jsonb,jsonb) from public,anon;
 grant execute on function public.create_document_with_lines(text,jsonb,jsonb) to authenticated;
 commit;
 notify pgrst,'reload schema';
