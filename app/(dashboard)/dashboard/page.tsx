import { ArrowUpRight, DollarSign, Receipt, Package, ShoppingBag, TrendingUp, Calendar, ArrowRight } from 'lucide-react';
import { createClient } from '@/utils/supabase/server';
import Link from 'next/link';

export default async function DashboardPage() {
    const supabase = await createClient();

    // 今月の初日を取得
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const monthLabel = `${now.getFullYear()}年${now.getMonth() + 1}月`;

    // 1. 全受注データ
    const { data: allOrders } = await supabase
        .from('orders')
        .select('*');

    // 2. 今月の受注データ
    const { data: thisMonthOrders } = await supabase
        .from('orders')
        .select('*')
        .gte('created_at', firstDayOfMonth);

    // 3. 全発注データ
    const { data: allPurchases } = await supabase
        .from('purchases')
        .select('total_amount');

    // 4. 今月の発注データ
    const { data: thisMonthPurchases } = await supabase
        .from('purchases')
        .select('total_amount')
        .gte('created_at', firstDayOfMonth);

    // 5. 未処理注文
    const { count: pendingOrdersCount } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .in('status', ['確認待ち', '新規受注']);

    // 6. 最新受注データ（5件）
    const { data: recentOrders } = await supabase
        .from('orders')
        .select(`*, customers ( company_name )`)
        .order('created_at', { ascending: false })
        .limit(5);

    // 7. 顧客数
    const { count: customerCount } = await supabase
        .from('customers')
        .select('*', { count: 'exact', head: true });

    // 8. 商品数
    const { count: productCount } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true });

    // KPI集計
    const totalSalesAll = (allOrders || []).reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);
    const totalSalesMonth = (thisMonthOrders || []).reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);
    const totalExpensesAll = (allPurchases || []).reduce((sum, p) => sum + (Number(p.total_amount) || 0), 0);
    const totalExpensesMonth = (thisMonthPurchases || []).reduce((sum, p) => sum + (Number(p.total_amount) || 0), 0);
    const orderCountAll = allOrders?.length || 0;
    const orderCountMonth = thisMonthOrders?.length || 0;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">ダッシュボード</h1>
                    <p className="text-slate-500 mt-1">リアルタイムの売上・経費・受注状況</p>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-500 bg-slate-100 px-3 py-1.5 rounded-lg">
                    <Calendar size={14} />
                    <span>{monthLabel}</span>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {/* 売上 */}
                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between">
                        <div className="p-3 rounded-xl bg-emerald-100">
                            <DollarSign className="text-emerald-600" size={24} />
                        </div>
                        <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                            {orderCountMonth > 0 ? `+${orderCountMonth}件` : '−'}
                        </span>
                    </div>
                    <div className="mt-4">
                        <h3 className="text-slate-500 text-xs font-bold uppercase tracking-wider">売上（受注総額）</h3>
                        <p className="text-3xl font-bold text-slate-900 mt-1.5 tracking-tight">¥{totalSalesAll.toLocaleString()}</p>
                        <p className="text-xs text-slate-400 mt-2">今月: ¥{totalSalesMonth.toLocaleString()}</p>
                    </div>
                </div>

                {/* 経費 */}
                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between">
                        <div className="p-3 rounded-xl bg-rose-100">
                            <Receipt className="text-rose-600" size={24} />
                        </div>
                    </div>
                    <div className="mt-4">
                        <h3 className="text-slate-500 text-xs font-bold uppercase tracking-wider">経費（仕入・発注）</h3>
                        <p className="text-3xl font-bold text-slate-900 mt-1.5 tracking-tight">¥{totalExpensesAll.toLocaleString()}</p>
                        <p className="text-xs text-slate-400 mt-2">今月: ¥{totalExpensesMonth.toLocaleString()}</p>
                    </div>
                </div>

                {/* 受注件数 */}
                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between">
                        <div className="p-3 rounded-xl bg-indigo-100">
                            <ShoppingBag className="text-indigo-600" size={24} />
                        </div>
                    </div>
                    <div className="mt-4">
                        <h3 className="text-slate-500 text-xs font-bold uppercase tracking-wider">受注件数</h3>
                        <p className="text-3xl font-bold text-slate-900 mt-1.5 tracking-tight">{orderCountAll} <span className="text-base font-normal text-slate-400">件</span></p>
                        <p className="text-xs text-slate-400 mt-2">今月: {orderCountMonth}件</p>
                    </div>
                </div>

                {/* 未処理 */}
                <div className={`rounded-2xl p-6 border shadow-sm hover:shadow-md transition-shadow ${(pendingOrdersCount || 0) > 0
                        ? 'bg-amber-50 border-amber-200'
                        : 'bg-white border-slate-200'
                    }`}>
                    <div className="flex items-start justify-between">
                        <div className={`p-3 rounded-xl ${(pendingOrdersCount || 0) > 0 ? 'bg-amber-200' : 'bg-amber-100'}`}>
                            <Package className="text-amber-600" size={24} />
                        </div>
                        {(pendingOrdersCount || 0) > 0 && (
                            <Link href="/orders" className="text-xs font-bold text-amber-700 bg-amber-100 hover:bg-amber-200 px-2.5 py-1 rounded-full transition-colors flex items-center gap-1">
                                対応する <ArrowRight size={12} />
                            </Link>
                        )}
                    </div>
                    <div className="mt-4">
                        <h3 className="text-slate-500 text-xs font-bold uppercase tracking-wider">未処理の注文</h3>
                        <p className={`text-3xl font-bold mt-1.5 tracking-tight ${(pendingOrdersCount || 0) > 0 ? 'text-amber-600' : 'text-slate-900'}`}>
                            {pendingOrdersCount || 0} <span className="text-base font-normal text-slate-400">件</span>
                        </p>
                        <p className="text-xs text-slate-400 mt-2">確認待ち・新規受注</p>
                    </div>
                </div>
            </div>

            {/* Recent Orders + Summary */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Recent Orders Table */}
                <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                    <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                        <h2 className="text-lg font-bold text-slate-900">最新の受注データ</h2>
                        <Link href="/orders" className="text-sm text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 transition-colors">
                            すべて見る <ArrowUpRight size={14} />
                        </Link>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-slate-600 whitespace-nowrap">
                            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                                <tr>
                                    <th className="font-medium py-3 px-5">ステータス</th>
                                    <th className="font-medium py-3 px-5">受注番号</th>
                                    <th className="font-medium py-3 px-5">顧客名</th>
                                    <th className="font-medium py-3 px-5 text-right">金額</th>
                                    <th className="font-medium py-3 px-5">発生元</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {recentOrders && recentOrders.length > 0 ? recentOrders.map((row: any) => {
                                    let statusColor = 'bg-slate-100 text-slate-700 border-slate-200';
                                    if (row.status === '確認待ち' || row.status === '新規受注') statusColor = 'bg-amber-100 text-amber-700 border-amber-200';
                                    if (row.status === '受注確定') statusColor = 'bg-emerald-100 text-emerald-700 border-emerald-200';
                                    if (row.status === '出荷準備中') statusColor = 'bg-sky-100 text-sky-700 border-sky-200';
                                    if (row.status === '納品済') statusColor = 'bg-slate-200 text-slate-700 border-slate-300';

                                    return (
                                        <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="py-3.5 px-5">
                                                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${statusColor}`}>
                                                    {row.status}
                                                </span>
                                            </td>
                                            <td className="py-3.5 px-5 font-mono text-xs text-slate-500">{row.order_number || '-'}</td>
                                            <td className="py-3.5 px-5 font-semibold text-slate-900">{(row.customers as any)?.company_name || '未紐付け'}</td>
                                            <td className="py-3.5 px-5 text-right font-bold">¥{(row.total_amount || 0).toLocaleString()}</td>
                                            <td className="py-3.5 px-5">
                                                {row.source_type ? (
                                                    <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded">
                                                        {row.source_type}
                                                    </span>
                                                ) : (
                                                    <span className="text-xs text-slate-500">手動</span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                }) : (
                                    <tr>
                                        <td colSpan={5} className="py-12 text-center text-slate-400">
                                            <ShoppingBag size={32} className="mx-auto text-slate-300 mb-3" />
                                            <p className="font-medium">まだ受注データがありません</p>
                                            <p className="text-xs mt-1">受注メニューから新規登録してください</p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Right Column: Profit + Quick Stats */}
                <div className="space-y-6">
                    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                        <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">利益サマリー（全期間）</h2>
                        <div className="flex items-center justify-center p-6 bg-slate-50 rounded-xl border border-slate-100">
                            <div className="text-center">
                                <div className="flex items-center justify-center gap-2 mb-2">
                                    <TrendingUp size={18} className={`${(totalSalesAll - totalExpensesAll) >= 0 ? 'text-emerald-500' : 'text-rose-500'}`} />
                                    <p className="text-xs text-slate-500 font-bold">売上 − 経費</p>
                                </div>
                                <p className={`text-3xl font-bold tracking-tight ${(totalSalesAll - totalExpensesAll) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                    ¥{(totalSalesAll - totalExpensesAll).toLocaleString()}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                        <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">マスターデータ</h2>
                        <div className="space-y-3">
                            <Link href="/customers" className="flex items-center justify-between p-3 bg-slate-50 hover:bg-indigo-50 rounded-xl transition-colors group">
                                <span className="font-bold text-sm text-slate-700 group-hover:text-indigo-700">顧客マスター</span>
                                <span className="text-lg font-bold text-indigo-600">{customerCount || 0}<span className="text-xs font-normal text-slate-400 ml-1">件</span></span>
                            </Link>
                            <Link href="/products" className="flex items-center justify-between p-3 bg-slate-50 hover:bg-indigo-50 rounded-xl transition-colors group">
                                <span className="font-bold text-sm text-slate-700 group-hover:text-indigo-700">商品マスター</span>
                                <span className="text-lg font-bold text-indigo-600">{productCount || 0}<span className="text-xs font-normal text-slate-400 ml-1">件</span></span>
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
