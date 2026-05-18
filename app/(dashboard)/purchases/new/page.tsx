import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, ShoppingCart } from 'lucide-react';
import PurchaseLinesForm from './purchase-lines-form';

export default async function NewPurchasePage() {
    const supabase = await createClient();

    // 仕入先一覧を取得
    const { data: suppliers } = await supabase
        .from('suppliers')
        .select('id, company_name')
        .order('company_name');

    // 商品一覧を取得
    const { data: products } = await supabase
        .from('products')
        .select('id, product_name, product_code, standard_price, tax_rate, unit')
        .eq('is_active', true)
        .order('product_name');

    // 発注番号を自動生成
    const year = new Date().getFullYear();
    const { count } = await supabase
        .from('purchases')
        .select('*', { count: 'exact', head: true });
    const purchaseNumber = `PUR-${year}-${String((count || 0) + 1).padStart(4, '0')}`;

    async function createPurchase(formData: FormData) {
        'use server';
        const supabase = await createClient();

        const linesJson = formData.get('lines') as string;
        const lines = linesJson ? JSON.parse(linesJson) : [];

        const subtotal = lines.reduce((sum: number, l: any) => sum + (Number(l.amount) || 0), 0);
        const taxAmount = lines.reduce((sum: number, l: any) => sum + (Number(l.tax_amount) || 0), 0);
        const totalAmount = subtotal + taxAmount;

        const supplierId = formData.get('supplier_id');

        const { data: purchase, error } = await supabase
            .from('purchases')
            .insert({
                purchase_number: formData.get('purchase_number'),
                supplier_id: supplierId || null,
                department: formData.get('department') || null,
                purchase_date: formData.get('purchase_date') || null,
                desired_delivery_date: formData.get('desired_delivery_date') || null,
                status: '下書き',
                subtotal,
                tax_amount: taxAmount,
                total_amount: totalAmount,
                notes: formData.get('notes') || null,
            })
            .select('id')
            .single();

        if (error) {
            console.error('Purchase insert error:', error);
            redirect('/purchases');
        }

        // 明細行を挿入
        if (lines.length > 0 && purchase) {
            const purchaseLines = lines.map((line: any, i: number) => ({
                purchase_id: purchase.id,
                line_no: i + 1,
                product_id: line.product_id || null,
                quantity: Number(line.quantity) || 0,
                unit: line.unit || null,
                unit_price: Number(line.unit_price) || 0,
                amount: Number(line.amount) || 0,
                tax_rate: Number(line.tax_rate) || 10,
                tax_amount: Number(line.tax_amount) || 0,
            }));

            await supabase.from('purchase_lines').insert(purchaseLines);
        }

        redirect('/purchases');
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
                <Link href="/purchases" className="p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 rounded-lg transition-colors">
                    <ArrowLeft size={20} />
                </Link>
                <div className="flex-1">
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <ShoppingCart size={24} className="text-indigo-600" />
                        新規発注の作成
                    </h1>
                    <p className="text-slate-500 mt-1">仕入先への発注書データを作成します</p>
                </div>
            </div>

            <form action={createPurchase}>
                {/* 基本情報 */}
                <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 space-y-5 mb-6">
                    <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider pb-3 border-b border-slate-100">基本情報</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700">発注番号</label>
                            <input name="purchase_number" type="text" defaultValue={purchaseNumber} className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-lg py-2.5 px-3 outline-none focus:bg-white focus:border-indigo-500 focus:ring-2 font-mono font-bold transition-all" />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700">仕入先</label>
                            <select name="supplier_id" className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-lg py-2.5 px-3 outline-none focus:bg-white focus:border-indigo-500 focus:ring-2 transition-all font-bold cursor-pointer">
                                <option value="">選択してください</option>
                                {(suppliers || []).map((s: any) => (
                                    <option key={s.id} value={s.id}>{s.company_name}</option>
                                ))}
                            </select>
                            {(!suppliers || suppliers.length === 0) && (
                                <p className="text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-lg">
                                    ⚠ 仕入先が未登録です。<Link href="/suppliers/new" className="underline font-bold">こちらから登録</Link>してください。
                                </p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700">発注日</label>
                            <input name="purchase_date" type="date" defaultValue={new Date().toISOString().split('T')[0]} className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-lg py-2.5 px-3 outline-none focus:bg-white focus:border-indigo-500 focus:ring-2 transition-all font-bold cursor-pointer" />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700">希望納品日</label>
                            <input name="desired_delivery_date" type="date" className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-lg py-2.5 px-3 outline-none focus:bg-white focus:border-indigo-500 focus:ring-2 transition-all font-bold cursor-pointer" />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700">部門</label>
                            <input name="department" type="text" placeholder="例: 資材部" className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-lg py-2.5 px-3 outline-none focus:bg-white focus:border-indigo-500 focus:ring-2 transition-all placeholder:text-slate-400" />
                        </div>
                    </div>
                </div>

                {/* 明細行 */}
                <PurchaseLinesForm products={products || []} />

                {/* 備考 */}
                <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 space-y-3 mb-6">
                    <label className="text-sm font-bold text-slate-700">備考・メモ</label>
                    <textarea name="notes" rows={3} placeholder="発注に関する備考" className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-lg py-2.5 px-3 outline-none focus:bg-white focus:border-indigo-500 focus:ring-2 transition-all resize-none placeholder:text-slate-400" />
                </div>

                {/* 送信 */}
                <div className="flex justify-end gap-3">
                    <Link href="/purchases" className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-colors">
                        キャンセル
                    </Link>
                    <button type="submit" className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-all shadow-sm shadow-indigo-200 hover:-translate-y-0.5">
                        <Save size={18} />
                        <span>発注を保存</span>
                    </button>
                </div>
            </form>
        </div>
    );
}
