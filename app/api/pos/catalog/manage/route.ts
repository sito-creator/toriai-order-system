import { catalogContext } from '@/utils/pos-catalog-server';
import { categoryInput, displaySettings, uuidPattern } from '@/utils/pos-catalog';
import { revalidatePath } from 'next/cache';

export async function POST(request: Request) {
    if (request.headers.get('origin') && request.headers.get('origin') !== new URL(request.url).origin)
        return Response.json({ error: '操作元を確認できません。' }, { status: 403 });
    try {
        const { db, companyId } = await catalogContext(true);
        const body = await request.json();
        let error;
        if (body.operation === 'category-save') {
            const values = { ...categoryInput(body.values), company_id: companyId };
            if (body.id) {
                if (!uuidPattern.test(body.id)) throw new Error('カテゴリーIDが不正です。');
                const r = await db.from('product_categories').update(values).eq('company_id', companyId).eq('id', body.id).select('id').maybeSingle();
                error = r.error;
                if (!error && !r.data) throw new Error('カテゴリーが更新されています。再読み込みしてください。');
            } else {
                const count = await db.from('product_categories').select('id', { count: 'exact', head: true }).eq('company_id', companyId);
                if (count.error) throw new Error('カテゴリー件数を確認できません。');
                if ((count.count ?? 0) >= 1000) throw new Error('カテゴリーは1000件まで登録できます。');
                const r = await db.from('product_categories').insert(values).select('id').single();
                error = r.error;
            }
        } else if (body.operation === 'category-delete') {
            if (!uuidPattern.test(body.id || '')) throw new Error('カテゴリーIDが不正です。');
            const r = await db.from('product_categories').delete().eq('company_id', companyId).eq('id', body.id).select('id').maybeSingle();
            error = r.error;
            if (!error && !r.data) throw new Error('カテゴリーが更新されています。再読み込みしてください。');
        } else if (body.operation === 'category-reorder') {
            if (!Array.isArray(body.ids) || body.ids.length > 1000 || body.ids.some((id: unknown) => typeof id !== 'string' || !uuidPattern.test(id)))
                throw new Error('表示順が不正です。');
            error = (await db.rpc('reorder_product_categories', { p_ids: body.ids })).error;
        } else if (body.operation === 'settings') {
            error = (await db.from('pos_display_settings').upsert({ company_id: companyId, ...displaySettings(body.values) })).error;
        } else if (body.operation === 'products') {
            if (!Array.isArray(body.ids) || !body.ids.length || body.ids.length > 100 ||
                new Set(body.ids).size !== body.ids.length || body.ids.some((id: unknown) => typeof id !== 'string' || !uuidPattern.test(id))) throw new Error('商品は1〜100件で選択してください。');
            const values: Record<string, unknown> = {};
            if (Object.hasOwn(body.values || {}, 'category_id')) {
                const id = body.values.category_id;
                if (id !== null && !uuidPattern.test(id)) throw new Error('カテゴリーIDが不正です。');
                values.category_id = id;
                // Explicit category clear, rather than retaining a stale legacy text label.
                if (id === null) values.category = null;
            }
            for (const key of ['pos_visible','pos_favorite']) {
                if (Object.hasOwn(body.values || {}, key)) {
                    if (typeof body.values[key] !== 'boolean') throw new Error('表示設定が不正です。');
                    values[key] = body.values[key];
                }
            }
            if (Object.hasOwn(body.values || {}, 'pos_sort_order')) {
                const n = body.values.pos_sort_order;
                if (!Number.isInteger(n) || n < 0 || n > 1000000) throw new Error('表示順は0〜1000000で入力してください。');
                values.pos_sort_order = n;
            }
            if (!Object.keys(values).length) throw new Error('変更内容を指定してください。');
            // Validate all ids before updating so cross-tenant ids are not silently counted as a success.
            const existing = await db.from('products').select('id').eq('company_id', companyId).in('id', body.ids);
            if (existing.error || existing.data?.length !== body.ids.length) throw new Error('選択商品を確認できません。再読み込みしてください。');
            const r = await db.from('products').update(values).eq('company_id', companyId).in('id', body.ids).select('id');
            error = r.error;
            if (!error && r.data?.length !== body.ids.length) throw new Error('更新件数が一致しません。再読み込みしてください。');
        } else throw new Error('操作が不正です。');
        if (error) throw new Error(error.code === '23505' ? '同じ名前のカテゴリーがあります。' : '保存に失敗しました。権限またはデータベース設定を確認してください。');
        revalidatePath('/products'); revalidatePath('/pos');
        return Response.json({ ok: true });
    } catch (e) {
        const error = (e as Error).message;
        return Response.json({ error }, { status: error.includes('ログイン') ? 401 : error.includes('のみ') ? 403 : 400 });
    }
}
