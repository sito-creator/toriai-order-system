import { createClient } from '@/utils/supabase/server';
import { getCurrentCompanyId } from '@/utils/auth';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import Link from 'next/link';
import { ArrowLeft, Save, ShoppingBag } from 'lucide-react';
import OrderLinesForm from './order-lines-form';

export default async function NewOrderPage() {
    const supabase = await createClient();
    const companyId = await getCurrentCompanyId();

    // 顧客一覧を取得（プルダウン用）
    const { data: customers } = await supabase
        .from('customers')
        .select('id, company_name')
        .eq('company_id', companyId)
        .order('company_name');

    // 商品一覧を取得（明細行用）
    const { data: products, error: prodError } = await supabase
        .from('products')
        .select('*')
        .order('product_name');
    
    if (prodError) {
        console.error("Products fetch error:", prodError);
    }
    
    // 不要なWHERE句 eq('is_active', true) によるエラーを回避するためフロントエンドでフィルタリングするかそのまま表示
    const activeProducts = products?.filter(p => p.is_active !== false) || [];

    // 受注番号を自動生成
    const year = new Date().getFullYear();
    const { count } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true });
    const orderNumber = `ORD-${year}-${String((count || 0) + 1).padStart(4, '0')}`;

    async function createOrder(formData: FormData) {
        'use server';
        const supabase = await createClient();
        const companyId = await getCurrentCompanyId();

        const linesJson = formData.get('lines') as string;
        const lines = linesJson ? JSON.parse(linesJson) : [];

        const subtotal = lines.reduce((sum: number, l: any) => sum + (Number(l.amount) || 0), 0);
        const taxAmount = lines.reduce((sum: number, l: any) => sum + (Number(l.tax_amount) || 0), 0);
        const totalAmount = subtotal + taxAmount;

        const { data: order, error } = await supabase
            .from('orders')
            .insert({
                company_id: companyId,
                order_number: formData.get('order_number') || `ORD-${Date.now()}`,
                customer_id: formData.get('customer_id') || null,
                order_date: formData.get('order_date') || null,
                delivery_date: formData.get('delivery_date') || null,
                status: '確認待ち',
                source_type: '手入力',
                total_amount: totalAmount,
            })
            .select('id')
            .single();

        if (error) {
            console.error('Order insert error:', error);
            throw new Error(`Order insertion failed: ${error.message} (code: ${error.code})`);
        }

        // 明細行を挿入
        if (lines.length > 0 && order) {
            const orderLines = lines.map((line: any, i: number) => ({
                company_id: companyId,
                order_id: order.id,
                line_no: i + 1,
                product_id: line.product_id || null,
                quantity: Number(line.quantity) || 0,
                unit_price: Number(line.unit_price) || 0,
                amount: Number(line.amount) || 0,
                tax_rate: Number(line.tax_rate) || 10,
                tax_amount: Number(line.tax_amount) || 0,
            }));

            await supabase.from('order_lines').insert(orderLines);
        }

        revalidatePath('/orders');
        redirect('/orders');
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
                <Link href="/orders" className="p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 rounded-lg transition-colors">
                    <ArrowLeft size={20} />
                </Link>
                <div className="flex-1">
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <ShoppingBag size={24} className="text-indigo-600" />
                        受注の手動入力
                    </h1>
                    <p className="text-slate-500 mt-1">新しい受注データを登録します</p>
                </div>
            </div>

            <form action={createOrder}>
                {/* 基本情報 */}
                <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 space-y-5 mb-6">
                    <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider pb-3 border-b border-slate-100">基本情報</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700">受注番号</label>
                            <input name="order_number" type="text" defaultValue={orderNumber} className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-lg py-2.5 px-3 outline-none focus:bg-white focus:border-indigo-500 focus:ring-2 font-mono font-bold transition-all" />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700 flex items-center justify-between">
                                <span>取引先（顧客） <span className="text-rose-500">*</span></span>
                                <Link href="/customers/new" className="text-xs text-indigo-600 hover:text-indigo-800 font-normal">マスタにない場合はこちらから追加</Link>
                            </label>
                            <select name="customer_id" required className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-lg py-2.5 px-3 outline-none focus:bg-white focus:border-indigo-500 focus:ring-2 transition-all font-bold cursor-pointer">
                                <option value="">選択してください</option>
                                {(customers || []).map((c: any) => (
                                    <option key={c.id} value={c.id}>{c.company_name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700">受注日</label>
                            <input name="order_date" type="date" defaultValue={new Date().toISOString().split('T')[0]} className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-lg py-2.5 px-3 outline-none focus:bg-white focus:border-indigo-500 focus:ring-2 transition-all font-bold cursor-pointer" />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700">希望納品日</label>
                            <input name="delivery_date" type="date" className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-lg py-2.5 px-3 outline-none focus:bg-white focus:border-indigo-500 focus:ring-2 transition-all font-bold cursor-pointer" />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700">部門</label>
                            <input name="department" type="text" placeholder="例: 営業部" className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-lg py-2.5 px-3 outline-none focus:bg-white focus:border-indigo-500 focus:ring-2 transition-all placeholder:text-slate-400" />
                        </div>
                    </div>
                </div>

                {/* 明細行（Client Component） */}
                <OrderLinesForm products={activeProducts} />

                {/* 備考 */}
                <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 space-y-3 mb-6">
                    <label className="text-sm font-bold text-slate-700">備考・メモ</label>
                    <textarea name="notes" rows={3} placeholder="備考があれば入力してください" className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-lg py-2.5 px-3 outline-none focus:bg-white focus:border-indigo-500 focus:ring-2 transition-all resize-none placeholder:text-slate-400" />
                </div>

                {/* 送信 */}
                <div className="flex justify-end gap-3">
                    <Link href="/orders" className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-colors">
                        キャンセル
                    </Link>
                    <button type="submit" className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-all shadow-sm shadow-indigo-200 hover:-translate-y-0.5">
                        <Save size={18} />
                        <span>受注を登録</span>
                    </button>
                </div>
            </form>
        </div>
    );
}
