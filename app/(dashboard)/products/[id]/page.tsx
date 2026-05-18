import { createClient } from '@/utils/supabase/server';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, Trash2, Package, Tag } from 'lucide-react';

export default async function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const supabase = await createClient();

    const { data: product, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .single();

    if (error || !product) {
        notFound();
    }

    async function updateProduct(formData: FormData) {
        'use server';
        const supabase = await createClient();
        const { error } = await supabase
            .from('products')
            .update({
                product_code: formData.get('product_code'),
                product_name: formData.get('product_name'),
                category: formData.get('category'),
                unit: formData.get('unit'),
                standard_price: Number(formData.get('standard_price')),
                tax_rate: Number(formData.get('tax_rate')),
                is_active: formData.get('is_active') === 'on',
                updated_at: new Date().toISOString(),
            })
            .eq('id', id);

        if (!error) {
            redirect('/products');
        } else {
            console.error(error);
        }
    }

    async function deleteProduct() {
        'use server';
        const supabase = await createClient();
        await supabase.from('products').delete().eq('id', id);
        redirect('/products');
    }

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
                <Link href="/products" className="p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 rounded-lg transition-colors">
                    <ArrowLeft size={20} />
                </Link>
                <div className="flex-1">
                    <h1 className="text-2xl font-bold text-slate-900">商品の編集</h1>
                    <p className="text-slate-500 mt-1">商品マスタの情報を更新します</p>
                </div>
                <form action={deleteProduct}>
                    <button type="submit" className="flex items-center gap-2 px-4 py-2.5 text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl font-bold text-sm transition-colors">
                        <Trash2 size={16} />
                        <span>削除</span>
                    </button>
                </form>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                <form action={updateProduct} className="p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700">商品コード</label>
                            <input name="product_code" type="text" defaultValue={product.product_code || ''} className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-lg py-2.5 px-3 outline-none focus:bg-white focus:border-indigo-500 focus:ring-2 font-mono transition-all font-medium" />
                        </div>

                        <div className="space-y-2 md:col-span-2">
                            <label className="text-sm font-bold text-slate-700">商品名 <span className="text-rose-500">*</span></label>
                            <input name="product_name" required type="text" defaultValue={product.product_name} className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-lg py-2.5 px-3 outline-none focus:bg-white focus:border-indigo-500 focus:ring-2 transition-all font-bold" />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700">標準単価（税抜） <span className="text-rose-500">*</span></label>
                            <div className="relative">
                                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 font-bold">¥</span>
                                <input name="standard_price" required type="number" min="0" defaultValue={product.standard_price || 0} className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-lg py-2.5 pl-8 pr-3 outline-none focus:bg-white focus:border-indigo-500 focus:ring-2 transition-all font-mono font-bold text-lg" />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700">単位</label>
                            <select name="unit" defaultValue={product.unit || '個'} className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-lg py-2.5 px-3 outline-none focus:bg-white focus:border-indigo-500 focus:ring-2 transition-all font-bold cursor-pointer">
                                <option value="台">台</option>
                                <option value="個">個</option>
                                <option value="式">式</option>
                                <option value="本">本</option>
                                <option value="月">月 (サブスクリプション)</option>
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700">カテゴリ</label>
                            <select name="category" defaultValue={product.category || 'ハードウェア'} className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-lg py-2.5 px-3 outline-none focus:bg-white focus:border-indigo-500 focus:ring-2 transition-all font-bold cursor-pointer">
                                <option value="ハードウェア">ハードウェア</option>
                                <option value="ソフトウェア">ソフトウェア</option>
                                <option value="サービス">サービス保守</option>
                                <option value="ライセンス">ライセンス</option>
                                <option value="消耗品">消耗品</option>
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700">適用税率</label>
                            <select name="tax_rate" defaultValue={product.tax_rate || 10} className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-lg py-2.5 px-3 outline-none focus:bg-white focus:border-indigo-500 focus:ring-2 transition-all font-bold cursor-pointer">
                                <option value="10">標準税率 (10%)</option>
                                <option value="8">軽減税率 (8%)</option>
                                <option value="0">非課税 (0%)</option>
                            </select>
                        </div>

                        <div className="space-y-2 md:col-span-2 pt-4">
                            <label className="flex items-center gap-3 cursor-pointer">
                                <input name="is_active" type="checkbox" defaultChecked={product.is_active !== false} className="w-5 h-5 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer" />
                                <span className="text-sm font-bold text-slate-700">販売中としてシステムに表示する</span>
                            </label>
                        </div>
                    </div>

                    <div className="pt-8 border-t border-slate-100 flex justify-end gap-3 mt-4">
                        <Link href="/products" className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-colors">
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
