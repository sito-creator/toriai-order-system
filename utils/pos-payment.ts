import { createAdminClient } from '@/utils/supabase/admin';
import { createPosCheckout, retrievePosCheckout } from '@/utils/stripe';
import { posPaymentState } from '@/utils/pos';

export async function ensurePosCheckout(id: string, companyId: string) {
    const db = createAdminClient();
    const { data: sale, error } = await db.from('pos_sales').select('*').eq('id',id).eq('company_id',companyId).single();
    if (error || !sale || sale.payment_method !== 'card') throw new Error('カード会計がありません。');
    if (sale.status !== 'pending' || sale.stripe_session_id) return sale;
    const origin = process.env.NEXT_PUBLIC_APP_URL;
    if (!origin) throw new Error('本番URLが未設定です。');
    const session = await createPosCheckout({ id, amount: sale.total, account: sale.stripe_account_id, origin });
    const { data: updated, error: updateError } = await db.from('pos_sales').update({stripe_session_id:session.id,checkout_url:session.url}).eq('id',id).eq('status','pending').select().single();
    if (updateError) throw new Error('決済URLを保存できません。再試行してください。');
    return updated;
}

export async function syncPosPayment(id: string, companyId: string) {
    const sale = await ensurePosCheckout(id,companyId);
    if (sale.status !== 'pending') return sale;
    const session = await retrievePosCheckout(sale.stripe_session_id,sale.stripe_account_id);
    const target = posPaymentState(session,sale);
    if (!target) return sale;
    const { data, error } = await createAdminClient().rpc('pos_transition',{p_id:id,p_company:companyId,p_target:target,p_reason:target==='voided'?'Stripe決済期限切れ':null});
    if (error) throw new Error('決済結果の保存に失敗しました。');
    return data;
}
