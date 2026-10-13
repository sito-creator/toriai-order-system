import { createClient } from '@/utils/supabase/server';
import { notFound, redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { Save, ArrowLeft, Trash2, AlertCircle, Package } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function EditSupplierProductPage({
    params,
    searchParams,
}: {
    params: Promise<{ id: string }>;
    searchParams: Promise<{ error?: string; success?: string }>;
}) {
    const { id } = await params;
    const query = await searchParams;
    const supabase = await createClient();

    const { data: sp, error } = await supabase
        .from('supplier_products')
        .select('*, suppliers ( company_name ), products ( product_name )')
        .eq('id', id)
        .single();

    if (error || !sp) {
        notFound();
    }

    // プルダウン用
    const { data: suppliers } = await supabase
        .from('suppliers')
        .select('id, company_name')
        .order('company_name');

    const { data: products } = await supabase
        .from('products')
        .select('id, product_name, product_code')
        .order('product_name');

    async function updateSupplierProduct(formData: FormData) {
        'use server';
        const supabase = await createClient();

        const supplierProductName = (formData.get('supplier_product_name') as string) || '';

        const { error } = await supabase
            .from('supplier_products')
            .update({
                supplier_id: formData.get('supplier_id'),
                product_id: formData.get('product_id') || null,
                product_name: supplierProductName || '名称未設定',
                supplier_product_name: supplierProductName || null,
                supplier_product_code: formData.get('supplier_product_code') || null,
                purchase_price: Number(formData.get('purchase_price')) || 0,
                min_order_qty: Number(formData.get('min_order_qty')) || 1,
                lead_time_days: Number(formData.get('lead_time_days')) || null,
            })
            .eq('id', id);

        if (error) {
            redirect(`/supplier-products/${id}/edit?error=${encodeURIComponent(error.message)}`);
            return;
        }

        revalidatePath('/supplier-products');
        redirect(`/supplier-products/${id}/edit?success=1`);
    }

    async function deleteSupplierProduct() {
        'use server';
        const supabase = await createClient();
        const { error } = await supabase.from('supplier_products').delete().eq('id', id);
        if (error) {
            redirect(`/supplier-products/${id}/edit?error=${encodeURIComponent(error.message)}`);
            return;
        }
        revalidatePath('/supplier-products');
        redirect('/supplier-products');
    }

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
                <Link href="/supplier-products" className="p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 rounded-lg transition-colors">
                    <ArrowLeft size={20} />
                </Link>
                <div className="flex-1">
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <Package size={24} className="text-indigo-600" />
                        仕入先商品の編集
                    </h1>
                    <p className="text-slate-500 mt-1">{sp.supplier_product_name || sp.product_name} の情報を変更します</p>
                </div>
                <form action={deleteSupplierProduct}>
                    <button type="submit" className="flex items-center gap-2 px-4 py-2.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl font-bold text-sm transition-colors border border-red-200">
                        <Trash2 size={16} />
                        <span>削除</span>
                    </button>
                </form>
            </div>

            {query.error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm flex items-start gap-2">
                    <AlertCircle size={18} className="mt-0.5 shrink-0" />
                    <div><p className="font-bold">エラー</p><p className="mt-1">{query.error}</p></div>
                </div>
            )}

            {query.success && (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-xl text-sm font-bold">
                    ✓ 仕入先商品情報を更新しました
                </div>
            )}

            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                <form action={updateSupplierProduct} className="p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* 仕入先 */}
                        <div className="space-y-2 md:col-span-2">
                            <label className="text-sm font-bold text-slate-700">仕入先 <span className="text-rose-500">*</span></label>
                            <select name="supplier_id" required defaultValue={sp.supplier_id} className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-lg py-2.5 px-3 outline-none focus:bg-white focus:border-indigo-500 focus:ring-2 transition-all font-bold cursor-pointer">
                                <option value="">-- 仕入先を選択 --</option>
                                {suppliers?.map((s: any) => (
                                    <option key={s.id} value={s.id}>{s.company_name}</option>
                                ))}
                            </select>
                        </div>

                        {/* 紐付け商品 */}
                        <div className="space-y-2 md:col-span-2">
                            <label className="text-sm font-bold text-slate-700">紐付け商品（自社商品マスタ）</label>
                            <select name="product_id" defaultValue={sp.product_id || ''} className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-lg py-2.5 px-3 outline-none focus:bg-white focus:border-indigo-500 focus:ring-2 transition-all font-bold cursor-pointer">
                                <option value="">-- 紐付けなし --</option>
                                {products?.map((p: any) => (
                                    <option key={p.id} value={p.id}>{p.product_name} {p.product_code ? `(${p.product_code})` : ''}</option>
                                ))}
                            </select>
                        </div>

                        {/* 仕入先商品名 */}
                        <div className="space-y-2 md:col-span-2">
                            <label className="text-sm font-bold text-slate-700">仕入先商品名</label>
                            <input name="supplier_product_name" type="text" defaultValue={sp.supplier_product_name || ''} placeholder="例: 仕入先側の商品名称" className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-lg py-2.5 px-3 outline-none focus:bg-white focus:border-indigo-500 focus:ring-2 transition-all font-bold" />
                        </div>

                        {/* 仕入先商品コード */}
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700">仕入先商品コード</label>
                            <input name="supplier_product_code" type="text" defaultValue={sp.supplier_product_code || ''} placeholder="例: VND-A001" className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-lg py-2.5 px-3 outline-none focus:bg-white focus:border-indigo-500 focus:ring-2 font-mono transition-all font-medium" />
                        </div>

                        {/* 仕入単価 */}
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700">仕入単価（税抜） <span className="text-rose-500">*</span></label>
                            <div className="relative">
                                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 font-bold">¥</span>
                                <input name="purchase_price" required type="number" min="0" defaultValue={sp.purchase_price || 0} className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-lg py-2.5 pl-8 pr-3 outline-none focus:bg-white focus:border-indigo-500 focus:ring-2 transition-all font-mono font-bold text-lg" />
                            </div>
                        </div>

                        {/* 最小発注数 */}
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700">最小発注数</label>
                            <input name="min_order_qty" type="number" min="1" defaultValue={sp.min_order_qty || 1} className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-lg py-2.5 px-3 outline-none focus:bg-white focus:border-indigo-500 focus:ring-2 transition-all font-mono font-bold" />
                        </div>

                        {/* リードタイム */}
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700">リードタイム（日数）</label>
                            <div className="relative">
                                <input name="lead_time_days" type="number" min="0" defaultValue={sp.lead_time_days || ''} placeholder="例: 7" className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-lg py-2.5 px-3 pr-10 outline-none focus:bg-white focus:border-indigo-500 focus:ring-2 transition-all font-mono font-bold" />
                                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium">日</span>
                            </div>
                        </div>
                    </div>

                    <div className="pt-6 border-t border-slate-100 flex justify-end gap-3 mt-8">
                        <Link href="/supplier-products" className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-colors">
                            キャンセル
                        </Link>
                        <button type="submit" className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-all shadow-sm shadow-indigo-200 hover:-translate-y-0.5">
                            <Save size={18} />
                            <span>変更を保存</span>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
