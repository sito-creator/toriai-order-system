import { createClient } from '@/utils/supabase/server';
import Link from 'next/link';
import { Layers, Plus, Package, Truck, MoreHorizontal } from 'lucide-react';
import CsvImportButton from '@/app/components/csv-import-button';
import { importSupplierProductsCsv } from '@/app/actions/csv';

export const dynamic = 'force-dynamic';

export default async function SupplierProductsPage() {
    const supabase = await createClient();
    const { data: supplierProducts, error } = await supabase
        .from('supplier_products')
        .select('*, suppliers ( company_name ), products ( product_name )')
        .order('created_at', { ascending: false });

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">仕入先商品</h1>
                    <p className="text-slate-500 mt-1">仕入先ごとの商品情報・仕入価格を管理</p>
                </div>
                <div className="flex items-center gap-2">
                    <CsvImportButton 
                        action={importSupplierProductsCsv} 
                        label="CSV取込" 
                        sampleCsvName="supplier_product_sample.csv"
                        sampleCsvData={"仕入先,商品名,仕入先商品コード,仕入単価,最小発注数,単位,リードタイム\n株式会社サンプル商事,サンプル商品A,SP-001,5000,10,個,7\nグローバルテック合同会社,導入支援サービス,SP-002,30000,1,式,14"}
                    />
                    <Link href="/supplier-products/new" className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl font-semibold transition-colors shadow-sm shadow-indigo-200">
                        <Plus size={18} />
                        <span>新規登録</span>
                    </Link>
                </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-600 whitespace-nowrap">
                        <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                            <tr>
                                <th className="font-medium py-3.5 px-6">仕入先</th>
                                <th className="font-medium py-3.5 px-6">商品名</th>
                                <th className="font-medium py-3.5 px-6">仕入先商品コード</th>
                                <th className="font-medium py-3.5 px-6 text-right">仕入単価</th>
                                <th className="font-medium py-3.5 px-6">最小発注数</th>
                                <th className="font-medium py-3.5 px-6">リードタイム</th>
                                <th className="font-medium py-3.5 px-6 text-right">アクション</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {supplierProducts && supplierProducts.length > 0 ? supplierProducts.map((sp: any) => (
                                <tr key={sp.id} className="hover:bg-slate-50 transition-colors group cursor-pointer">
                                    <td className="py-4 px-6 font-semibold text-slate-900">
                                        <div className="flex items-center gap-2">
                                            <Truck size={14} className="text-slate-400" />
                                            {(sp.suppliers as any)?.company_name || '-'}
                                        </div>
                                    </td>
                                    <td className="py-4 px-6">
                                        <div className="flex items-center gap-2">
                                            <Package size={14} className="text-slate-400" />
                                            <div>
                                                <div className="group-hover:text-indigo-600 transition-colors">{sp.supplier_product_name || (sp.products as any)?.product_name || '-'}</div>
                                                {sp.supplier_product_name && (sp.products as any)?.product_name && (
                                                    <div className="text-xs text-slate-400 mt-0.5">紐付: {(sp.products as any).product_name}</div>
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="py-4 px-6 font-mono text-xs text-slate-500">{sp.supplier_product_code || '-'}</td>
                                    <td className="py-4 px-6 text-right font-bold">¥{(sp.purchase_price || 0).toLocaleString()}</td>
                                    <td className="py-4 px-6">{sp.min_order_qty || '-'}</td>
                                    <td className="py-4 px-6">{sp.lead_time_days ? `${sp.lead_time_days}日` : '-'}</td>
                                    <td className="py-4 px-6 text-right">
                                        <Link href={`/supplier-products/${sp.id}/edit`} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                                            <MoreHorizontal size={16} />
                                            編集
                                        </Link>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={7} className="py-16 text-center text-slate-400">
                                        <Layers size={40} className="mx-auto text-slate-300 mb-4" />
                                        <p className="font-bold text-slate-700 text-base">仕入先商品がまだ登録されていません</p>
                                        <p className="text-sm mt-1 text-slate-500">仕入先ごとの商品情報・仕入価格を登録しましょう</p>
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
