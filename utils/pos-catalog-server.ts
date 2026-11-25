import { createClient } from '@/utils/supabase/server';
import { productPrice } from '@/utils/product-price';
import { catalogPage, defaultPosSettings, imageRoute, type CatalogProduct, type PosCategory, type PosDisplaySettings } from '@/utils/pos-catalog';

export async function catalogContext(manager = false) {
    const db = await createClient();
    const { data: { user } } = await db.auth.getUser();
    if (!user) throw new Error('ログインが必要です。');
    const { data: profile, error } = await db.from('profiles').select('company_id,role').eq('id', user.id).single();
    if (error || !profile?.company_id) throw new Error('会社情報を確認できません。');
    const canManage = ['owner', 'admin'].includes(profile.role);
    if (manager && !canManage) throw new Error('会社オーナー・管理者のみ操作できます。');
    return { db, companyId: profile.company_id as string, canManage };
}
export async function catalogOptions(db: Awaited<ReturnType<typeof createClient>>, companyId: string) {
    const [cats, prefs] = await Promise.all([
        db.from('product_categories').select('*').eq('company_id', companyId).order('sort_order').order('id').limit(1000),
        db.from('pos_display_settings').select('*').eq('company_id', companyId).maybeSingle(),
    ]);
    const missing = [cats.error, prefs.error].some(e => e && ['42P01','42703','PGRST205','PGRST204'].includes(e.code));
    if (!missing && (cats.error || prefs.error)) throw new Error('POS表示設定を取得できません。再読み込みしてください。');
    return {
        categories: (cats.data || []) as PosCategory[],
        settings: (prefs.data || defaultPosSettings) as PosDisplaySettings,
        schemaReady: !missing,
    };
}
export async function readCatalog(params: URLSearchParams) {
    const { db, companyId, canManage } = await catalogContext();
    const management = params.get('management') === '1';
    if (management && !canManage) throw new Error('管理者権限が必要です。');
    const { categories, settings, schemaReady } = await catalogOptions(db, companyId);
    const { page, search, category, pageSize } = catalogPage(params);
    let query = db.from('products').select('*', { count: 'exact' }).eq('company_id', companyId);
    if (!management) {
        query = query.eq('is_active', true);
        if (schemaReady && params.get('inventory') !== '1') query = query.eq('pos_visible', true);
    }
    if (search) query = query.or(`product_name.ilike.%${search}%,product_code.ilike.%${search}%`);
    if (schemaReady) {
        if (category === 'uncategorized') query = query.is('category_id', null);
        else if (category !== 'all') query = query.eq('category_id', category);
        if (!management && settings.favorites_first) query = query.order('pos_favorite', { ascending: false });
        if (settings.product_sort === 'manual' || management) query = query.order('pos_sort_order');
        // Price sorting uses the canonical effective price (standard_price then legacy price).
        if (settings.product_sort === 'price' && !management) query = query.order('pos_effective_price');
    }
    query = query.order('product_name').order('id').range(page * pageSize, (page + 1) * pageSize - 1);
    const { data, error, count } = await query;
    if (error) throw new Error('商品一覧を取得できません。再読み込みしてください。');
    const products: CatalogProduct[] = (data || []).map(p => ({
        id: p.id, name: p.product_name, code: p.product_code || '', price: productPrice(p),
        tax_rate: Number(p.tax_rate ?? 10), category: p.category || '未分類', category_id: p.category_id || null,
        stock: p.stock ?? null, track_inventory: Boolean(p.track_inventory), image_url: imageRoute(p.id, p.image_path),
        pos_visible: p.pos_visible !== false, pos_favorite: Boolean(p.pos_favorite), pos_sort_order: p.pos_sort_order ?? 0,
    }));
    return { products, categories, settings, schemaReady, canManage, total: count ?? 0, page, pageSize };
}
