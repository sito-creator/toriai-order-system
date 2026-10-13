import Link from 'next/link';
import { createClient } from '@/utils/supabase/server';
import { Package, Search, Plus, MoreHorizontal, Tag, Upload } from 'lucide-react';
import CsvImportButton from '@/app/components/csv-import-button';
import { importProductsCsv } from '@/app/actions/csv';

export default async function ProductsPage() {
    const supabase = await createClient();
    const { data: products } = await supabase.from('products').select('*').order('created_at', { ascending: false });

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">商品管理</h1>
                    <p className="text-slate-500 mt-1">自社の商品およびサービスマスタを管理します</p>
                </div>
                <div className="flex bg-white items-center gap-2">
                    <CsvImportButton 
                        action={importProductsCsv} 
                        label="CSV取込" 
                        sampleCsvName="product_sample.csv"
                        sampleCsvData="商品コード,商品名,標準単価,仕入単価,単位,カテゴリ,有効\nPROD-001,サンプル商品A,10000,5000,個,ソフトウェア,TRUE\nPROD-002,導入支援サービス,50000,0,式,サービス,TRUE"
                    />
                    <Link href="/products/new" className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl font-medium transition-colors shadow-sm shadow-indigo-200">
                        <Plus size={18} />
                        <span>新規商品を登録</span>
                    </Link>
                </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
                <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-4">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input type="text" placeholder="商品コードや商品名で検索..." className="w-full bg-slate-50 hover:bg-slate-100/50 border border-slate-200 text-slate-900 rounded-lg py-2.5 pl-10 pr-4 outline-none focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all text-sm" />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-600 whitespace-nowrap">
                        <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                            <tr>
                                <th className="font-medium py-3.5 px-6">商品情報</th>
                                <th className="font-medium py-3.5 px-6">カテゴリ</th>
                                <th className="font-medium py-3.5 px-6 text-right">標準単価 (単位)</th>
                                <th className="font-medium py-3.5 px-6 text-center">税率</th>
                                <th className="font-medium py-3.5 px-6 text-center">販売状況</th>
                                <th className="font-medium py-3.5 px-6 text-center">詳細</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {products && products.length > 0 ? (
                                products.map((product) => (
                                    <tr key={product.id} className="hover:bg-slate-50/80 transition-colors">
                                        <td className="py-4 px-6">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500 shrink-0">
                                                    <Package size={20} />
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-slate-900">{product.product_name}</p>
                                                    <p className="text-[11px] text-slate-500 font-mono mt-0.5">{product.product_code || '未設定'}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-4 px-6">
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 border border-slate-200 text-slate-600 text-[11px] font-semibold">
                                                <Tag size={12} />
                                                {product.category || '未分類'}
                                            </span>
                                        </td>
                                        <td className="py-4 px-6 text-right font-bold text-slate-900 text-base">
                                            ¥{(product.standard_price || product.price || 0).toLocaleString()} <span className="text-slate-400 font-normal text-xs ml-1">/ {product.unit || '個'}</span>
                                        </td>
                                        <td className="py-4 px-6 text-center">{product.tax_rate || 10}%</td>
                                        <td className="py-4 px-6 text-center">
                                            {product.is_active ?
                                                <span className="text-emerald-700 bg-emerald-100 border border-emerald-200 px-2.5 py-1 rounded-full text-xs font-bold">販売中</span> :
                                                <span className="text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full text-xs font-semibold">販売停止</span>
                                            }
                                        </td>
                                        <td className="py-4 px-6 text-center">
                                            <Link href={`/products/${product.id}`} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors inline-flex"><MoreHorizontal size={18} /></Link>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={6} className="py-16 text-center text-slate-500">
                                        <Package size={40} className="mx-auto text-slate-300 mb-4" />
                                        <p className="font-bold text-slate-700 text-base">商品データがありません</p>
                                        <p className="text-sm mt-1 mb-6 text-slate-500">取り扱う商品やサービスのマスタデータを登録しましょう</p>
                                        <button className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-all hover:-translate-y-0.5"><Plus size={16} /><span>新規商品を登録</span></button>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
