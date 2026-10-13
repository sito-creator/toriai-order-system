import { createClient } from '@/utils/supabase/server';
import { getCurrentCompanyId } from '@/utils/auth';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import Link from 'next/link';
import { ArrowLeft, Save, ShoppingCart } from 'lucide-react';
import PurchaseLinesForm from './purchase-lines-form';

export default async function NewPurchasePage() {
    const supabase = await createClient();
    const companyId = await getCurrentCompanyId();

    // 仕入先一覧を取得
    const { data: suppliers } = await supabase
        .from('suppliers')
        .select('id, company_name')
        .eq('company_id', companyId)
        .order('company_name');

    // 仕入先商品一覧を取得（仕入先名も含む）
    const { data: supplierProducts } = await supabase
        .from('supplier_products')
        .select('*, suppliers ( company_name )')
        .order('supplier_product_name');

    const formattedSupplierProducts = (supplierProducts || []).map((sp: any) => ({
        id: sp.id,
        supplier_product_name: sp.supplier_product_name || '',
        supplier_product_code: sp.supplier_product_code || null,
        purchase_price: sp.purchase_price || null,
        tax_rate: sp.tax_rate || null,
        unit: sp.unit || null,
        supplier_id: sp.supplier_id || null,
        supplier_name: sp.suppliers?.company_name || '',
    }));

    // 発注番号を自動生成
    const year = new Date().getFullYear();
    const { count } = await supabase
        .from('purchases')
        .select('*', { count: 'exact', head: true });
    const purchaseNumber = `PUR-${year}-${String((count || 0) + 1).padStart(4, '0')}`;

    async function createPurchase(formData: FormData) {
        'use server';
        const supabase = await createClient();
        const companyId = await getCurrentCompanyId();

        const linesJson = formData.get('lines') as string;
        const lines = linesJson ? JSON.parse(linesJson) : [];

        const subtotal = lines.reduce((sum: number, l: any) => sum + (Number(l.amount) || 0), 0);
        const taxAmount = lines.reduce((sum: number, l: any) => sum + (Number(l.tax_amount) || 0), 0);
        const totalAmount = subtotal + taxAmount;

        const supplierId = formData.get('supplier_id');

        const { data: purchase, error } = await supabase
            .from('purchases')
            .insert({
                company_id: companyId,
                purchase_number: formData.get('purchase_number'),
                supplier_id: supplierId || null,
                purchase_date: formData.get('purchase_date') || null,
                expected_delivery_date: formData.get('expected_delivery_date') || null,
                status: '下書き',
                total_amount: totalAmount,
            })
            .select('id')
            .single();

        if (error) {
            console.error('Purchase insert error:', error);
            throw new Error(`発注の保存に失敗しました: ${JSON.stringify(error)}`);
        }

        // 明細行を挿入
        if (lines.length > 0 && purchase) {
            const purchaseLines = lines.map((line: any, i: number) => ({
                company_id: companyId,
                purchase_id: purchase.id,
                line_no: i + 1,
                supplier_product_id: line.supplier_product_id || null,
                product_name: line.product_name || '',
                quantity: Number(line.quantity) || 0,
                unit: line.unit || null,
                unit_price: Number(line.unit_price) || 0,
                amount: Number(line.amount) || 0,
                tax_rate: Number(line.tax_rate) || 10,
                tax_amount: Number(line.tax_amount) || 0,
            }));

            const { error: linesError } = await supabase.from('purchase_lines').insert(purchaseLines);
            if (linesError) {
                console.error('Purchase lines insert error:', linesError);
            }
        }

        revalidatePath('/purchases');
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
                            <label className="text-sm font-bold text-slate-700 flex items-center justify-between">
                                <span>仕入先</span>
                                <Link href="/suppliers/new" className="text-xs text-indigo-600 hover:text-indigo-800 font-normal">マスタにない場合はこちらから追加</Link>
                            </label>
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
                            <input name="expected_delivery_date" type="date" className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-lg py-2.5 px-3 outline-none focus:bg-white focus:border-indigo-500 focus:ring-2 transition-all font-bold cursor-pointer" />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700">部門</label>
                            <input name="department" type="text" placeholder="例: 資材部" className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-lg py-2.5 px-3 outline-none focus:bg-white focus:border-indigo-500 focus:ring-2 transition-all placeholder:text-slate-400" />
                        </div>
                    </div>
                </div>

                {/* 明細行（仕入先商品を使用） */}
                <PurchaseLinesForm supplierProducts={formattedSupplierProducts} />

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
