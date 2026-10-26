import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { posTotals, PosLine } from '@/utils/pos';

async function context() {
    const db = await createClient();
    const { data: { user } } = await db.auth.getUser();
    if (!user) throw new Error('ログインが必要です。');
    const { data: profile } = await db.from('profiles').select('company_id, role').eq('id', user.id).single();
    if (!profile?.company_id) throw new Error('会社情報がありません。');
    return { db, user, profile };
}

export async function GET() {
    try {
        const { db, profile } = await context();
        const { data, error } = await db.from('pos_sales').select('*').eq('company_id', profile.company_id).order('created_at', { ascending: false }).limit(300);
        if (error) return Response.json({ error: 'POS売上を取得できません。POS用データベース設定を確認してください。' }, { status: 503 });
        return Response.json({ sales: data });
    } catch (e) { return Response.json({ error: (e as Error).message }, { status: 401 }); }
}

export async function POST(request: Request) {
    try {
        const { db, user, profile } = await context();
        const body = await request.json();
        if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.id || '') || !Array.isArray(body.lines) || !body.lines.length || body.lines.length > 100 || body.lines.some((x: PosLine | null) => !x || typeof x.product_id !== 'string')) throw new Error('会計内容が不正です。');
        const admin = createAdminClient();
        const { data: existing } = await admin.from('pos_sales').select('*').eq('id', body.id).eq('company_id', profile.company_id).maybeSingle();
        if (existing) return Response.json({ sale: existing });
        const { data: products, error } = await db.from('products').select('*').eq('company_id', profile.company_id).in('id', body.lines.map((x: PosLine) => x.product_id));
        if (error) throw new Error('商品情報を取得できません。');
        const lines: PosLine[] = body.lines.map((x: PosLine) => {
            const p = products?.find(p => p.id === x.product_id);
            if (!p || p.is_active === false) throw new Error('販売できない商品が含まれています。');
            return { product_id: p.id, name: p.product_name, price: Number(p.standard_price ?? p.price ?? 0), quantity: x.quantity, tax_rate: Number(p.tax_rate ?? 10) };
        });
        const totals = posTotals(lines);
        if (body.expected_total !== totals.total) return Response.json({ error: '商品価格が更新されました。画面を再読み込みして会計金額をご確認ください。', retryable: false }, { status: 409 });
        if (!totals.total || !Number.isSafeInteger(body.received) || body.received < totals.total || body.received > 99999999) throw new Error('預かり金額を確認してください。');
        const { data: company } = await db.from('companies').select('*').eq('id', profile.company_id).single();
        if (!company?.name) throw new Error('発行事業者の会社情報を確認してください。');
        const { data: settings } = await db.from('company_settings').select('*').eq('company_id', profile.company_id).maybeSingle();
        const sale = { id: body.id, company_id: profile.company_id, created_by: user.id, lines, issuer: { name: company?.name, address: settings?.address || company?.address, registration_number: settings?.registration_number || company?.registration_number }, subtotal: totals.subtotal, tax: totals.tax, total: totals.total, received: body.received, change: body.received - totals.total, payment_method: 'cash', status: 'paid' };
        const { data, error: saveError } = await admin.from('pos_sales').insert(sale).select().single();
        if (saveError) {
            if (saveError.code === '23505') {
                const { data: retry } = await admin.from('pos_sales').select('*').eq('id', body.id).eq('company_id', profile.company_id).single();
                if (retry) return Response.json({ sale: retry });
            }
            return Response.json({ error: '会計の保存に失敗しました。再試行してください。' }, { status: 503 });
        }
        return Response.json({ sale: data });
    } catch (e) { return Response.json({ error: (e as Error).message, retryable: false }, { status: 400 }); }
}

export async function PATCH(request: Request) {
    try {
        const { user, profile } = await context();
        if (!['owner', 'admin'].includes(profile.role)) throw new Error('取消には会社オーナーまたは管理者権限が必要です。');
        const { id, reason } = await request.json();
        if (typeof reason !== 'string' || !reason.trim() || reason.length > 500) throw new Error('取消理由を入力してください。');
        const { data, error } = await createAdminClient().from('pos_sales').update({ status: 'voided', void_reason: reason.trim(), voided_by: user.id, voided_at: new Date().toISOString() }).eq('company_id', profile.company_id).eq('id', id).eq('status', 'paid').select().single();
        if (error || !data) throw new Error('会計を取り消せませんでした。');
        return Response.json({ sale: data });
    } catch (e) { return Response.json({ error: (e as Error).message }, { status: 400 }); }
}
