-- Additive migration. Run after the existing product/POS migrations, before deploying the UI.
BEGIN;
CREATE OR REPLACE FUNCTION public.pos_catalog_manager(p_company uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
 SELECT EXISTS(SELECT 1 FROM public.profiles WHERE id=auth.uid() AND company_id=p_company AND role IN ('owner','admin'))
$$;
REVOKE ALL ON FUNCTION public.pos_catalog_manager(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.pos_catalog_manager(uuid) TO authenticated;

CREATE TABLE IF NOT EXISTS public.product_categories (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 company_id uuid NOT NULL REFERENCES public.companies(id),
 name text NOT NULL CHECK(length(btrim(name)) BETWEEN 1 AND 60),
 color text NOT NULL DEFAULT '#4F46E5' CHECK(color ~ '^#[0-9a-fA-F]{6}$'),
 sort_order integer NOT NULL DEFAULT 0 CHECK(sort_order BETWEEN 0 AND 1000000),
 is_visible boolean NOT NULL DEFAULT true,
 UNIQUE(company_id,name), UNIQUE(id,company_id)
);
CREATE TABLE IF NOT EXISTS public.pos_display_settings (
 company_id uuid PRIMARY KEY REFERENCES public.companies(id),
 card_mode text NOT NULL DEFAULT 'image' CHECK(card_mode IN ('image','text','compact')),
 card_size text NOT NULL DEFAULT 'medium' CHECK(card_size IN ('small','medium','large')),
 show_images boolean NOT NULL DEFAULT true,
 show_prices boolean NOT NULL DEFAULT true,
 product_sort text NOT NULL DEFAULT 'manual' CHECK(product_sort IN ('manual','name','price')),
 favorites_first boolean NOT NULL DEFAULT true
);
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS category_id uuid;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS image_path text;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS pos_visible boolean NOT NULL DEFAULT true;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS pos_favorite boolean NOT NULL DEFAULT false;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS pos_sort_order integer NOT NULL DEFAULT 0;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS pos_effective_price numeric
 GENERATED ALWAYS AS (COALESCE(standard_price,price,0)) STORED;
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conname='products_catalog_category_fk') THEN
  ALTER TABLE public.products ADD CONSTRAINT products_catalog_category_fk
   FOREIGN KEY(category_id,company_id) REFERENCES public.product_categories(id,company_id)
   ON DELETE SET NULL (category_id);
 END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conname='products_catalog_image_path') THEN
  ALTER TABLE public.products ADD CONSTRAINT products_catalog_image_path
   CHECK(image_path IS NULL OR image_path ~ ('^' || company_id::text || '/[0-9a-f-]{36}\.webp$'));
 END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conname='products_catalog_order') THEN
  ALTER TABLE public.products ADD CONSTRAINT products_catalog_order CHECK(pos_sort_order BETWEEN 0 AND 1000000);
 END IF;
END $$;
CREATE INDEX IF NOT EXISTS products_pos_catalog ON public.products(company_id,is_active,pos_visible,category_id,pos_sort_order,id);
CREATE INDEX IF NOT EXISTS categories_pos_order ON public.product_categories(company_id,sort_order,id);
CREATE INDEX IF NOT EXISTS products_pos_price ON public.products(company_id,pos_effective_price,id);
CREATE UNIQUE INDEX IF NOT EXISTS products_image_path_unique ON public.products(image_path) WHERE image_path IS NOT NULL;

-- Preserve existing category labels. No product is deleted or assigned to a different company.
INSERT INTO public.product_categories(company_id,name)
 SELECT DISTINCT company_id, btrim(category) FROM public.products
 WHERE company_id IS NOT NULL AND length(btrim(category)) BETWEEN 1 AND 60
 ON CONFLICT(company_id,name) DO NOTHING;
UPDATE public.products p SET category_id=c.id FROM public.product_categories c
 WHERE p.company_id=c.company_id AND btrim(p.category)=c.name AND p.category_id IS NULL;

ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_display_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS catalog_read ON public.product_categories;
CREATE POLICY catalog_read ON public.product_categories FOR SELECT TO authenticated USING(company_id=public.get_my_company_id());
DROP POLICY IF EXISTS catalog_write ON public.product_categories;
CREATE POLICY catalog_write ON public.product_categories FOR ALL TO authenticated
 USING(public.pos_catalog_manager(company_id)) WITH CHECK(public.pos_catalog_manager(company_id));
DROP POLICY IF EXISTS pos_display_read ON public.pos_display_settings;
CREATE POLICY pos_display_read ON public.pos_display_settings FOR SELECT TO authenticated USING(company_id=public.get_my_company_id());
DROP POLICY IF EXISTS pos_display_write ON public.pos_display_settings;
CREATE POLICY pos_display_write ON public.pos_display_settings FOR ALL TO authenticated
 USING(public.pos_catalog_manager(company_id)) WITH CHECK(public.pos_catalog_manager(company_id));
GRANT SELECT,INSERT,UPDATE,DELETE ON public.product_categories, public.pos_display_settings TO authenticated;

-- Invoker trigger: members can keep editing legacy fields, but cannot alter new management fields.
CREATE OR REPLACE FUNCTION public.guard_product_catalog() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
DECLARE changed boolean; category_name text;
BEGIN
 changed := CASE WHEN TG_OP='INSERT' THEN
  NEW.category_id IS NOT NULL OR NEW.image_path IS NOT NULL OR NOT NEW.pos_visible OR NEW.pos_favorite OR NEW.pos_sort_order<>0
 ELSE ROW(NEW.category_id,NEW.image_path,NEW.pos_visible,NEW.pos_favorite,NEW.pos_sort_order)
  IS DISTINCT FROM ROW(OLD.category_id,OLD.image_path,OLD.pos_visible,OLD.pos_favorite,OLD.pos_sort_order) END;
 IF changed AND current_user NOT IN ('postgres','supabase_admin','service_role')
    AND NOT public.pos_catalog_manager(NEW.company_id) THEN
  RAISE EXCEPTION '商品画像・POS表示設定の変更には管理者権限が必要です' USING ERRCODE='42501';
 END IF;
 -- Existing CSV/legacy editors still write category text. Resolve existing labels without creating categories.
 IF TG_OP='INSERT' AND NEW.category_id IS NULL THEN
  SELECT id INTO NEW.category_id FROM public.product_categories WHERE company_id=NEW.company_id AND name=btrim(NEW.category);
 END IF;
 IF TG_OP='UPDATE' AND NEW.category IS DISTINCT FROM OLD.category AND NEW.category_id IS NOT DISTINCT FROM OLD.category_id THEN
  SELECT id INTO NEW.category_id FROM public.product_categories WHERE company_id=NEW.company_id AND name=btrim(NEW.category);
 END IF;
 IF NEW.category_id IS NOT NULL THEN
  SELECT name INTO category_name FROM public.product_categories WHERE id=NEW.category_id AND company_id=NEW.company_id;
  IF NOT FOUND THEN RAISE EXCEPTION '他社または存在しないカテゴリーです'; END IF;
  NEW.category := category_name;
 ELSIF TG_OP='UPDATE' AND OLD.category_id IS NOT NULL THEN
  -- FK's ON DELETE SET NULL keeps products; the obsolete label is removed.
  IF NEW.category IS NOT DISTINCT FROM OLD.category THEN NEW.category := NULL; END IF;
 END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS product_catalog_guard ON public.products;
CREATE TRIGGER product_catalog_guard BEFORE INSERT OR UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.guard_product_catalog();
CREATE OR REPLACE FUNCTION public.rename_product_category() RETURNS trigger
LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
 IF NEW.name IS DISTINCT FROM OLD.name THEN
  UPDATE public.products SET category=NEW.name WHERE company_id=NEW.company_id AND category_id=NEW.id;
 END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS product_category_rename ON public.product_categories;
CREATE TRIGGER product_category_rename AFTER UPDATE OF name ON public.product_categories FOR EACH ROW EXECUTE FUNCTION public.rename_product_category();

-- Atomic bounded reordering; never accept a company id from the caller.
CREATE OR REPLACE FUNCTION public.reorder_product_categories(p_ids uuid[]) RETURNS void
LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
DECLARE company uuid := public.get_my_company_id();
BEGIN
 IF NOT public.pos_catalog_manager(company) THEN RAISE EXCEPTION '管理者権限が必要です' USING ERRCODE='42501'; END IF;
 IF cardinality(p_ids)>1000 OR cardinality(p_ids)<>(SELECT count(DISTINCT x) FROM unnest(p_ids) x)
  OR (SELECT count(*) FROM public.product_categories WHERE company_id=company)<>cardinality(p_ids)
  OR EXISTS(SELECT 1 FROM unnest(p_ids) x WHERE NOT EXISTS(SELECT 1 FROM public.product_categories WHERE id=x AND company_id=company))
 THEN RAISE EXCEPTION 'カテゴリー一覧が更新されました。再読込してください'; END IF;
 UPDATE public.product_categories c SET sort_order=t.ord::integer
 FROM unnest(p_ids) WITH ORDINALITY t(id,ord) WHERE c.id=t.id AND c.company_id=company;
END $$;
REVOKE ALL ON FUNCTION public.reorder_product_categories(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reorder_product_categories(uuid[]) TO authenticated;

-- New private bucket, rather than making product images public through company_assets.
INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
 VALUES('product-images','product-images',false,2097152,ARRAY['image/webp'])
 ON CONFLICT(id) DO NOTHING;
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM storage.buckets WHERE id='product-images' AND public) THEN
  RAISE EXCEPTION 'product-images must be a private bucket';
 END IF;
END $$;
DROP POLICY IF EXISTS product_images_read ON storage.objects;
CREATE POLICY product_images_read ON storage.objects FOR SELECT TO authenticated
 USING(bucket_id='product-images' AND split_part(name,'/',1)=public.get_my_company_id()::text);
DROP POLICY IF EXISTS product_images_insert ON storage.objects;
CREATE POLICY product_images_insert ON storage.objects FOR INSERT TO authenticated
 WITH CHECK(bucket_id='product-images' AND split_part(name,'/',1)=public.get_my_company_id()::text AND public.pos_catalog_manager(public.get_my_company_id()));
DROP POLICY IF EXISTS product_images_delete ON storage.objects;
CREATE POLICY product_images_delete ON storage.objects FOR DELETE TO authenticated
 USING(bucket_id='product-images' AND split_part(name,'/',1)=public.get_my_company_id()::text AND public.pos_catalog_manager(public.get_my_company_id()));
COMMIT;
