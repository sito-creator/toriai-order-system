import { createClient } from '@/utils/supabase/server';
import { redirect, notFound } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import Link from 'next/link';
import { ArrowLeft, Save, ShoppingBag } from 'lucide-react';
import OrderLinesForm from '../../new/order-lines-form';

export default async function EditOrderPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const supabase = await createClient();

    // 顧客一覧を取得（プルダウン用）
    const { data: customers } = await supabase
        .from('customers')
        .select('id, company_name')
        .order('company_name');

    // 商品一覧を取得（明細行用）
    const { data: products } = await supabase
        .from('products')
        .select('*')
        .order('product_name');
    
    // 受注データとその明細を取得
    const { data: order, error: orderError } = await supabase
        .from('orders')
        .select(`
            *,
            order_lines (
                *,
                products (
                    product_name
                )
            )
        `)
        .eq('id', id)
        .single();
        
    if (orderError || !order) {
        notFound();
    }
    if (order.pos_sale_id) redirect(`/orders/${id}`);

    const activeProducts = products?.filter(p => p.is_active !== false) || [];
    
    // 明細データの初期値を組み立てる
    const initialLines = (order.order_lines || [])
        .sort((a: any, b: any) => a.line_no - b.line_no)
        .map((line: any) => ({
            product_id: line.product_id,
            product_name: line.products?.product_name || '',
            quantity: line.quantity,
            unit_price: line.unit_price,
            amount: line.amount,
            tax_rate: line.tax_rate,
            tax_amount: line.tax_amount,
        }));

    async function updateOrder(formData: FormData) {
        'use server';
        const supabase = await createClient();

        const linesJson = formData.get('lines') as string;
        const lines = linesJson ? JSON.parse(linesJson) : [];

        const subtotal = lines.reduce((sum: number, l: any) => sum + (Number(l.amount) || 0), 0);
        const taxAmount = lines.reduce((sum: number, l: any) => sum + (Number(l.tax_amount) || 0), 0);
        const totalAmount = subtotal + taxAmount;

        // ヘッダーを更新
        const { error: headerError } = await supabase
            .from('orders')
            .update({
                customer_id: formData.get('customer_id') || null,
                order_date: formData.get('order_date') || null,
                delivery_date: formData.get('delivery_date') || null,
                total_amount: totalAmount,
            })
            .eq('id', id);

        if (headerError) {
            console.error('Order update error:', headerError);
            throw new Error(`Order update failed: ${headerError.message}`);
        }

        // 既存の明細を一旦削除して入れ直す
        const { error: deleteError } = await supabase.from('order_lines').delete().eq('order_id', id);
        if (deleteError) {
            console.error('Order lines delete error:', deleteError);
        }

        if (lines.length > 0) {
            const orderLines = lines.map((line: any, i: number) => ({
                order_id: id,
                line_no: i + 1,
                product_id: line.product_id || null,
                quantity: Number(line.quantity) || 0,
                unit_price: Number(line.unit_price) || 0,
                amount: Number(line.amount) || 0,
                tax_rate: Number(line.tax_rate) || 10,
                tax_amount: Number(line.tax_amount) || 0,
            }));

            const { error: insertError } = await supabase.from('order_lines').insert(orderLines);
            if (insertError) {
                console.error('Order lines insert error:', insertError);
            }
        }

        revalidatePath(`/orders/${id}`);
        revalidatePath('/orders');
        redirect(`/orders/${id}`);
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
                <Link href={`/orders/${id}`} className="p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 rounded-lg transition-colors">
                    <ArrowLeft size={20} />
                </Link>
                <div className="flex-1">
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <ShoppingBag size={24} className="text-indigo-600" />
                        受注の編集: {order.order_number}
                    </h1>
                    <p className="text-slate-500 mt-1">受注関連情報や明細を編集します</p>
                </div>
            </div>

            <form action={updateOrder}>
                {/* 基本情報 */}
                <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 space-y-5 mb-6">
                    <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider pb-3 border-b border-slate-100">基本情報</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700">受注番号</label>
                            <input name="order_number" type="text" readOnly defaultValue={order.order_number} className="w-full bg-slate-100 border border-slate-200 text-slate-500 rounded-lg py-2.5 px-3 outline-none font-mono font-bold cursor-not-allowed" />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700">
                                取引先（顧客） <span className="text-rose-500">*</span>
                            </label>
                            <select name="customer_id" required defaultValue={order.customer_id || ''} className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-lg py-2.5 px-3 outline-none focus:bg-white focus:border-indigo-500 focus:ring-2 transition-all font-bold cursor-pointer">
                                <option value="">選択してください</option>
                                {(customers || []).map((c: any) => (
                                    <option key={c.id} value={c.id}>{c.company_name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700">受注日</label>
                            <input name="order_date" type="date" defaultValue={order.order_date || ''} className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-lg py-2.5 px-3 outline-none focus:bg-white focus:border-indigo-500 focus:ring-2 transition-all font-bold cursor-pointer" />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700">希望納品日</label>
                            <input name="delivery_date" type="date" defaultValue={order.delivery_date || ''} className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-lg py-2.5 px-3 outline-none focus:bg-white focus:border-indigo-500 focus:ring-2 transition-all font-bold cursor-pointer" />
                        </div>
                    </div>
                </div>

                {/* 明細行（Client Component） */}
                <OrderLinesForm products={activeProducts} initialLines={initialLines} />

                {/* 送信 */}
                <div className="flex justify-end gap-3">
                    <Link href={`/orders/${id}`} className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-colors">
                        キャンセル
                    </Link>
                    <button type="submit" className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-all shadow-sm shadow-indigo-200 hover:-translate-y-0.5">
                        <Save size={18} />
                        <span>変更を保存</span>
                    </button>
                </div>
            </form>
        </div>
    );
}
