import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { Save, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function NewProductPage() {
    async function addProduct(formData: FormData) {
        'use server';
        const supabase = await createClient();
        const { error } = await supabase.from('products').insert([{
            product_code: formData.get('product_code'),
            product_name: formData.get('product_name'),
            category: formData.get('category'),
            unit: formData.get('unit'),
            standard_price: Number(formData.get('standard_price')),
            is_active: formData.get('is_active') === 'on'
        }]);

        if (!error) {
            revalidatePath('/products');
            redirect('/products');
        } else {
            console.error(error);
        }
    }

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
                <Link href="/products" className="p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 rounded-lg transition-colors">
                    <ArrowLeft size={20} />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">新規商品の登録</h1>
                    <p className="text-slate-500 mt-1">取り扱い製品や月額サービスをマスタに追加します</p>
                </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
                <form action={addProduct} className="p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700">商品コード</label>
                            <input name="product_code" type="text" placeholder="例: PRD-001" className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-lg py-2.5 px-3 outline-none focus:bg-white focus:border-indigo-500 focus:ring-2 font-mono transition-all font-medium" />
                        </div>

                        <div className="space-y-2 md:col-span-2">
                            <label className="text-sm font-bold text-slate-700">商品・品目名 <span className="text-rose-500">*</span></label>
                            <input name="product_name" required type="text" placeholder="例: ハイエンドノートPC" className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-lg py-2.5 px-3 outline-none focus:bg-white focus:border-indigo-500 focus:ring-2 transition-all font-bold" />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700">標準単価（税抜） <span className="text-rose-500">*</span></label>
                            <div className="relative">
                                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 font-bold">¥</span>
                                <input name="standard_price" required type="number" min="0" placeholder="0" className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-lg py-2.5 pl-8 pr-3 outline-none focus:bg-white focus:border-indigo-500 focus:ring-2 transition-all font-mono font-bold text-lg" />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700">単位</label>
                            <select name="unit" className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-lg py-2.5 px-3 outline-none focus:bg-white focus:border-indigo-500 focus:ring-2 transition-all font-bold cursor-pointer">
                                <option value="台">台</option>
                                <option value="個">個</option>
                                <option value="式">式</option>
                                <option value="月">月 (サブスクリプション)</option>
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700">カテゴリ</label>
                            <select name="category" className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-lg py-2.5 px-3 outline-none focus:bg-white focus:border-indigo-500 focus:ring-2 transition-all font-bold cursor-pointer">
                                <option value="ハードウェア">ハードウェア</option>
                                <option value="ソフトウェア">ソフトウェア</option>
                                <option value="サービス">サービス保守</option>
                                <option value="ライセンス">ライセンス</option>
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700">適用税率</label>
                            <select name="tax_rate" className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-lg py-2.5 px-3 outline-none focus:bg-white focus:border-indigo-500 focus:ring-2 transition-all font-bold cursor-pointer">
                                <option value="10">標準税率 (10%)</option>
                                <option value="8">軽減税率 (8%)</option>
                                <option value="0">非課税 (0%)</option>
                            </select>
                        </div>

                        <div className="space-y-2 md:col-span-2 pt-4">
                            <label className="flex items-center gap-3 cursor-pointer">
                                <input name="is_active" type="checkbox" defaultChecked className="w-5 h-5 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer" />
                                <span className="text-sm font-bold text-slate-700">販売開始としてシステムに表示する</span>
                            </label>
                        </div>
                    </div>

                    <div className="pt-8 border-t border-slate-100 flex justify-end gap-3 mt-4">
                        <Link href="/products" className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-colors">
                            キャンセル
                        </Link>
                        <button type="submit" className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-all shadow-sm shadow-indigo-200 hover:-translate-y-0.5">
                            <Save size={18} />
                            <span>本番データベースに登録</span>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
