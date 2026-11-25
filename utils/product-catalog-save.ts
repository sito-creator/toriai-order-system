import { createClient } from '@/utils/supabase/server';
import { normalizeProductImage } from '@/utils/product-image';
import { uuidPattern } from '@/utils/pos-catalog';

export async function prepareProductCatalog(form: FormData, companyId: string, db: Awaited<ReturnType<typeof createClient>>, id?: string) {
    const { data: { user } } = await db.auth.getUser();
    const { data: profile } = user ? await db.from('profiles').select('company_id,role').eq('id', user.id).single() : { data: null };
    if (profile?.company_id !== companyId || !['owner','admin'].includes(profile.role)) throw new Error('画像・POS設定の変更には会社管理者権限が必要です。');
    const cat = String(form.get('category_id') || '');
    if (cat && !uuidPattern.test(cat)) throw new Error('カテゴリーを選択し直してください。');
    const sort = Number(form.get('pos_sort_order') || 0);
    if (!Number.isInteger(sort) || sort < 0 || sort > 1000000) throw new Error('表示順は0〜1000000で入力してください。');
    const fields: Record<string, unknown> = { category_id: cat || null, category: null,
        pos_visible: form.get('pos_visible') === 'on', pos_favorite: form.get('pos_favorite') === 'on', pos_sort_order: sort };
    if (cat) {
        const { data } = await db.from('product_categories').select('id,name').eq('company_id', companyId).eq('id', cat).single();
        if (!data) throw new Error('カテゴリーを確認できません。再読み込みしてください。');
        fields.category = data.name;
    }
    let oldPath: string | null = null;
    if (id) {
        const { data, error } = await db.from('products').select('image_path').eq('company_id', companyId).eq('id', id).single();
        if (error || !data) throw new Error('編集する商品を確認できません。');
        oldPath = data.image_path;
    }
    let uploaded: string | null = null;
    const file = form.get('product_image');
    if (file instanceof File && file.size) {
        const buffer = await normalizeProductImage(file);
        uploaded = `${companyId}/${crypto.randomUUID()}.webp`;
        const { error } = await db.storage.from('product-images').upload(uploaded, buffer, { contentType: 'image/webp', upsert: false, cacheControl: '300' });
        if (error) throw new Error('画像を保存できません。ストレージの設定と権限を確認してください。');
        fields.image_path = uploaded;
    } else if (form.get('remove_product_image') === '1') fields.image_path = null;
    async function remove(path: string | null) {
        if (path?.startsWith(companyId + '/')) {
            try {
                // A network error can occur AFTER the DB commits. Never remove a possibly referenced image.
                const check = await db.from('products').select('id').eq('company_id', companyId).eq('image_path', path).limit(1).maybeSingle();
                if (check.error || check.data) return;
                await db.storage.from('product-images').remove([path]);
            }
            catch { /* A failed cleanup never undoes a confirmed product save. See retention runbook. */ }
        }
    }
    return { fields, failure: () => remove(uploaded), success: () => remove(Object.hasOwn(fields, 'image_path') && oldPath !== fields.image_path ? oldPath : null) };
}
