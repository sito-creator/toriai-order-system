import { createClient } from '@/utils/supabase/server';
import PosRegister from './register';

export default async function PosPage() {
    const db = await createClient();
    const { data: { user } } = await db.auth.getUser();
    const { data: profile } = user ? await db.from('profiles').select('company_id').eq('id', user.id).single() : { data: null };
    if (!profile?.company_id) return <p>ログインと会社設定を確認してください。</p>;
    const { data, error } = await db.from('products').select('*').eq('company_id', profile.company_id).eq('is_active', true).order('product_name');
    if (error) return <p>商品を読み込めませんでした。</p>;
    return <PosRegister products={(data || []).map(p => ({ id: p.id, name: p.product_name, price: Number(p.standard_price ?? p.price ?? 0), tax_rate: Number(p.tax_rate ?? 10), category: p.category || 'サービス' }))} />;
}
