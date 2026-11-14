-- One transaction: a failed line insert rolls back both the header and old lines.
-- SECURITY INVOKER preserves the caller's existing RLS permissions.
begin;
create or replace function public.save_order_with_lines(p_order_id uuid, p_header jsonb, p_lines jsonb)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
    v_company uuid := public.get_my_company_id();
    v_id uuid := p_order_id;
    v_order public.orders%rowtype;
    v_line jsonb;
    v_product uuid;
    v_qty numeric;
    v_price numeric;
    v_rate numeric;
    v_amount numeric;
    v_tax numeric;
    v_total numeric := 0;
    v_no integer := 0;
begin
    if auth.uid() is null or v_company is null then raise exception '所属会社を確認できません'; end if;
    if jsonb_typeof(p_lines) is distinct from 'array' or jsonb_array_length(p_lines) = 0 then
        raise exception '明細を1行以上入力してください';
    end if;
    if not exists (select 1 from public.customers where id = (p_header->>'customer_id')::uuid and company_id = v_company) then
        raise exception '取引先を確認できません';
    end if;
    -- Validate everything before changing existing data. Never trust submitted totals.
    for v_line in select value from jsonb_array_elements(p_lines) loop
        v_product := nullif(v_line->>'product_id', '')::uuid;
        if v_product is not null and not exists (select 1 from public.products where id = v_product and company_id = v_company) then
            raise exception '商品を確認できません';
        end if;
        v_qty := (v_line->>'quantity')::numeric;
        v_price := (v_line->>'unit_price')::numeric;
        v_rate := (v_line->>'tax_rate')::numeric;
        if v_qty is null or v_qty <= 0 or v_qty::text in ('NaN','Infinity','-Infinity')
           or v_price is null or v_price < 0 or v_price::text in ('NaN','Infinity','-Infinity')
           or v_rate is null or v_rate not in (0,8,10) then raise exception '数量・単価・税率を確認してください'; end if;
        v_amount := v_qty * v_price;
        v_tax := floor(v_amount * v_rate / 100);
        v_total := v_total + v_amount + v_tax;
    end loop;
    if v_id is null then
        insert into public.orders (company_id, order_number, customer_id, order_date, delivery_date, status, source_type, total_amount)
        values (v_company, p_header->>'order_number', (p_header->>'customer_id')::uuid,
                nullif(p_header->>'order_date','')::date, nullif(p_header->>'delivery_date','')::date, '確認待ち', '手入力', v_total)
        returning id into v_id;
    else
        select * into v_order from public.orders where id = v_id and company_id = v_company for update;
        if not found then raise exception '受注が見つからないか編集権限がありません'; end if;
        if v_order.pos_sale_id is not null or v_order.source_type = 'POS' then raise exception 'POS受注はこの画面から編集できません'; end if;
        update public.orders set customer_id = (p_header->>'customer_id')::uuid,
            order_date = nullif(p_header->>'order_date','')::date,
            delivery_date = nullif(p_header->>'delivery_date','')::date, total_amount = v_total
        where id = v_id and company_id = v_company;
        delete from public.order_lines where order_id = v_id and company_id = v_company;
    end if;
    for v_line in select value from jsonb_array_elements(p_lines) loop
        v_no := v_no + 1;
        v_qty := (v_line->>'quantity')::numeric;
        v_price := (v_line->>'unit_price')::numeric;
        v_rate := (v_line->>'tax_rate')::numeric;
        v_amount := v_qty * v_price;
        insert into public.order_lines (company_id, order_id, line_no, product_id, quantity, unit_price, amount, tax_rate, tax_amount, item_name)
        values (v_company, v_id, v_no, nullif(v_line->>'product_id','')::uuid, v_qty, v_price, v_amount, v_rate, floor(v_amount*v_rate/100), nullif(v_line->>'product_name',''));
    end loop;
    return v_id;
end;
$$;
revoke all on function public.save_order_with_lines(uuid,jsonb,jsonb) from public, anon;
grant execute on function public.save_order_with_lines(uuid,jsonb,jsonb) to authenticated;
commit;
