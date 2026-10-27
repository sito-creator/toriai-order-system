-- POS is the source of truth. The unique link and transactional trigger make retries safe.
begin;
alter table public.orders add column if not exists pos_sale_id uuid references public.pos_sales(id);
create unique index if not exists orders_pos_sale_unique on public.orders(pos_sale_id);
alter table public.order_lines add column if not exists item_name text;

create or replace function public.pos_sync_order() returns trigger
language plpgsql security definer set search_path = public as $$
declare oid uuid; line jsonb; n integer := 0; amount numeric; rate numeric;
  totals jsonb := '{}'; allocated jsonb := '{}'; tax numeric;
begin
  if new.status = 'pending' then return new; end if;
  select id into oid from orders where pos_sale_id = new.id;
  -- An unpaid expired Checkout must not become a sale.
  if new.status = 'voided' and oid is null and new.paid_at is null and new.payment_method <> 'cash' then return new; end if;
  insert into orders(company_id,pos_sale_id,order_number,source_type,status,total_amount,order_date,delivery_date,created_at)
    values(new.company_id,new.id,'POS-' || new.id::text,'POS',
      case when new.status='paid' then '納品済' else '取消済' end,new.total,
      (coalesce(new.paid_at,new.created_at) at time zone 'Asia/Tokyo')::date,
      (coalesce(new.paid_at,new.created_at) at time zone 'Asia/Tokyo')::date,coalesce(new.paid_at,new.created_at))
    on conflict(pos_sale_id) do update set status=excluded.status,total_amount=excluded.total_amount
    returning id into oid;
  -- Existing detail snapshots never change on repeated notifications or cancellation.
  if exists(select 1 from order_lines where order_id=oid) then return new; end if;
  for line in select value from jsonb_array_elements(new.lines) loop
    rate := (line->>'tax_rate')::numeric;
    amount := (line->>'price')::numeric * (line->>'quantity')::numeric;
    totals := jsonb_set(totals,array[rate::text],to_jsonb(coalesce((totals->>rate::text)::numeric,0)+amount));
  end loop;
  for line in select value from jsonb_array_elements(new.lines) loop
    n := n+1; rate := (line->>'tax_rate')::numeric;
    amount := (line->>'price')::numeric * (line->>'quantity')::numeric;
    -- Difference of cumulative floors preserves the POS tax-rate-group rounding.
    tax := floor((coalesce((allocated->>rate::text)::numeric,0)+amount)*rate/100)
      - floor(coalesce((allocated->>rate::text)::numeric,0)*rate/100);
    allocated := jsonb_set(allocated,array[rate::text],to_jsonb(coalesce((allocated->>rate::text)::numeric,0)+amount));
    insert into order_lines(company_id,order_id,line_no,product_id,item_name,quantity,unit_price,amount,tax_rate,tax_amount)
      values(new.company_id,oid,n,nullif(line->>'product_id','')::uuid,line->>'name',
        (line->>'quantity')::numeric,(line->>'price')::numeric,amount,rate,tax);
  end loop;
  return new;
end $$;
revoke all on function public.pos_sync_order() from public,anon,authenticated;
drop trigger if exists pos_order_sync on public.pos_sales;
create trigger pos_order_sync after insert or update of status on public.pos_sales
  for each row execute function public.pos_sync_order();

-- Protect synchronized records even against direct REST edits by authenticated users.
create or replace function public.pos_order_readonly() returns trigger
language plpgsql set search_path=public as $$
declare linked boolean;
begin
  if current_user in ('postgres','supabase_admin') then
    if tg_op='DELETE' then return old; else return new; end if;
  end if;
  if tg_table_name='orders' then
    if tg_op <> 'INSERT' then linked := old.pos_sale_id is not null; end if;
    if tg_op <> 'DELETE' then linked := coalesce(linked,false) or new.pos_sale_id is not null; end if;
  else
    if tg_op <> 'INSERT' then select exists(select 1 from orders where id=old.order_id and pos_sale_id is not null) into linked; end if;
    if tg_op <> 'DELETE' then linked := coalesce(linked,false) or exists(select 1 from orders where id=new.order_id and pos_sale_id is not null); end if;
  end if;
  if linked then raise exception 'POS連携受注はPOSレジから操作してください'; end if;
  if tg_op='DELETE' then return old; else return new; end if;
end $$;
drop trigger if exists pos_order_readonly on public.orders;
create trigger pos_order_readonly before insert or update or delete on public.orders for each row execute function public.pos_order_readonly();
drop trigger if exists pos_line_readonly on public.order_lines;
create trigger pos_line_readonly before insert or update or delete on public.order_lines for each row execute function public.pos_order_readonly();
-- Backfill through the same idempotent trigger (no change to payment or inventory).
update public.pos_sales set status=status where status in ('paid','voided');
commit;
