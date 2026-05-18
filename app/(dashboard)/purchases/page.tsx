import { createClient } from '@/utils/supabase/server';
import { Search, Plus, Filter, ArrowRight, ShoppingCart, Send, Clock, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

export default async function PurchasesPage() {
    const supabase = await createClient();

    // Fetch purchases with nested supplier data
    const { data: purchases } = await supabase
        .from('purchases')
        .select(`
            *,
            suppliers (company_name)
        `)
        .order('created_at', { ascending: false });

    // Status badge style generator
    const getStatusConfig = (status: string) => {
        switch (status) {
            case '下書き': return 'bg-slate-100 text-slate-700 border-slate-200';
            case '承認待ち': return 'bg-amber-100 text-amber-700 border-amber-200';
            case '発注済': return 'bg-sky-100 text-sky-700 border-sky-200';
            case '入荷済': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
            case '検収済': return 'bg-indigo-100 text-indigo-700 border-indigo-200';
            default: return 'bg-slate-100 text-slate-600 border-slate-200';
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">発注管理</h1>
                    <p className="text-slate-500 mt-1">仕入先への発注データ作成とステータス追跡</p>
                </div>
                <div className="flex items-center gap-3">
                    <button className="flex items-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-4 py-2.5 rounded-xl font-semibold transition-colors shadow-sm">
                        <Filter size={18} />
                        <span>絞り込み</span>
                    </button>
                    <Link href="/purchases/new" className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl font-semibold transition-colors shadow-sm shadow-indigo-200">
                        <Plus size={18} />
                        <span>新規発注を作成</span>
                    </Link>
                </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
                {/* Toolbar */}
                <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-4">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="仕入先名や発注番号で検索..."
                            className="w-full bg-slate-50 hover:bg-slate-100/50 border border-slate-200 text-slate-900 rounded-lg py-2.5 pl-10 pr-4 outline-none focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all text-sm"
                        />
                    </div>
                </div>

                {/* Table Content */}
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-600 whitespace-nowrap">
                        <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                            <tr>
                                <th className="font-medium py-3.5 px-6">発注番号</th>
                                <th className="font-medium py-3.5 px-6">仕入先 / 外注先</th>
                                <th className="font-medium py-3.5 px-6">ステータス</th>
                                <th className="font-medium py-3.5 px-6 text-right">発注金額</th>
                                <th className="font-medium py-3.5 px-6">希望納期</th>
                                <th className="font-medium py-3.5 px-6 text-center">詳細</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {purchases && purchases.length > 0 ? (
                                purchases.map((purchase) => (
                                    <tr key={purchase.id} className="hover:bg-slate-50/80 transition-colors">
                                        <td className="py-4 px-6 font-semibold text-slate-900">
                                            {purchase.purchase_number || '----------'}
                                        </td>
                                        <td className="py-4 px-6 font-semibold text-slate-800">
                                            {(purchase.suppliers as any)?.company_name || <span className="text-slate-400 font-normal">名称未設定</span>}
                                        </td>
                                        <td className="py-4 px-6">
                                            <span className={`inline-flex items-center px-2.5 py-1.5 rounded-full text-xs font-bold border ${getStatusConfig(purchase.status)}`}>
                                                {purchase.status === '承認待ち' && <Clock size={14} className="mr-1.5" />}
                                                {purchase.status === '発注済' && <Send size={14} className="mr-1.5" />}
                                                {purchase.status === '入荷済' && <CheckCircle2 size={14} className="mr-1.5" />}
                                                {purchase.status || '下書き'}
                                            </span>
                                        </td>
                                        <td className="py-4 px-6 text-right font-bold text-slate-900 text-base">
                                            ¥{(purchase.total_amount || 0).toLocaleString()}
                                        </td>
                                        <td className="py-4 px-6 text-xs text-slate-600 font-medium">
                                            {purchase.desired_delivery_date || '設定なし'}
                                        </td>
                                        <td className="py-4 px-6 text-center">
                                            <button className="inline-flex items-center justify-center p-2 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-all hover:scale-105 active:scale-95">
                                                <ArrowRight size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={6} className="py-16 text-center text-slate-500">
                                        <ShoppingCart size={40} className="mx-auto text-slate-300 mb-4" />
                                        <p className="font-bold text-slate-700 text-base">発注データがありません</p>
                                        <p className="text-sm mt-1 mb-6 text-slate-500">在庫の欠品や外注依頼が発生した場合に、ここから発注書を作成します</p>
                                        <Link href="/purchases/new" className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-all hover:shadow-lg hover:-translate-y-0.5">
                                            <Plus size={16} />
                                            <span>新規発注データ作成</span>
                                        </Link>
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
