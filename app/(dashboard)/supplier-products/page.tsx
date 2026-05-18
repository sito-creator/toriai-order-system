import { createClient } from '@/utils/supabase/server';
import Link from 'next/link';
import { Layers, Plus, Package, Truck } from 'lucide-react';

export default async function SupplierProductsPage() {
    const supabase = await createClient();
    const { data: supplierProducts } = await supabase
        .from('supplier_products')
        .select('*, suppliers ( company_name ), products ( product_name, product_code )')
        .order('created_at', { ascending: false });

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">発注先商品</h1>
                    <p className="text-slate-500 mt-1">仕入先ごとの商品情報・仕入価格を管理</p>
                </div>
                <Link href="/supplier-products/new" className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl font-semibold transition-colors shadow-sm shadow-indigo-200">
                    <Plus size={18} />
                    <span>新規登録</span>
                </Link>
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
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {supplierProducts && supplierProducts.length > 0 ? supplierProducts.map((sp: any) => (
                                <tr key={sp.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="py-4 px-6 font-semibold text-slate-900">
                                        <div className="flex items-center gap-2">
                                            <Truck size={14} className="text-slate-400" />
                                            {(sp.suppliers as any)?.company_name || '-'}
                                        </div>
                                    </td>
                                    <td className="py-4 px-6">
                                        <div className="flex items-center gap-2">
                                            <Package size={14} className="text-slate-400" />
                                            {(sp.products as any)?.product_name || sp.supplier_product_name || '-'}
                                        </div>
                                    </td>
                                    <td className="py-4 px-6 font-mono text-xs text-slate-500">{sp.supplier_product_code || '-'}</td>
                                    <td className="py-4 px-6 text-right font-bold">¥{(sp.purchase_price || 0).toLocaleString()}</td>
                                    <td className="py-4 px-6">{sp.min_order_qty || '-'} {sp.unit || ''}</td>
                                    <td className="py-4 px-6">{sp.lead_time_days ? `${sp.lead_time_days}日` : '-'}</td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={6} className="py-16 text-center text-slate-400">
                                        <Layers size={40} className="mx-auto text-slate-300 mb-4" />
                                        <p className="font-bold text-slate-700 text-base">発注先商品がまだ登録されていません</p>
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
