import { createClient } from '@/utils/supabase/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, Clock, AlertCircle, Package, Calendar, Building2, FileText, Truck } from 'lucide-react';

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const supabase = await createClient();

    const { data: order, error } = await supabase
        .from('orders')
        .select(`
            *,
            customers ( id, company_name, contact_name, email, phone ),
            order_lines ( *, products ( product_name, product_code ) )
        `)
        .eq('id', id)
        .single();

    if (error || !order) {
        notFound();
    }

    const getStatusConfig = (status: string) => {
        switch (status) {
            case '確認待ち': return { color: 'bg-amber-100 text-amber-700 border-amber-200', icon: <AlertCircle size={16} /> };
            case '受注確定': return { color: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: <CheckCircle2 size={16} /> };
            case '出荷準備中': return { color: 'bg-sky-100 text-sky-700 border-sky-200', icon: <Truck size={16} /> };
            case '納品済': return { color: 'bg-slate-100 text-slate-700 border-slate-200', icon: <CheckCircle2 size={16} /> };
            default: return { color: 'bg-slate-100 text-slate-600 border-slate-200', icon: null };
        }
    };

    const statusConfig = getStatusConfig(order.status);

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Link href="/orders" className="p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 rounded-lg transition-colors">
                    <ArrowLeft size={20} />
                </Link>
                <div className="flex-1">
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl font-bold text-slate-900">{order.order_number || '受注番号なし'}</h1>
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border ${statusConfig.color}`}>
                            {statusConfig.icon}
                            {order.status}
                        </span>
                    </div>
                    <p className="text-slate-500 mt-1">受注の詳細情報と明細を確認できます</p>
                </div>
            </div>

            {/* Info Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                    <div className="flex items-center gap-2 text-slate-500 mb-3">
                        <Building2 size={16} />
                        <span className="text-xs font-bold uppercase tracking-wider">取引先</span>
                    </div>
                    <p className="font-bold text-slate-900 text-lg">{(order.customers as any)?.company_name || '未紐付け'}</p>
                    {(order.customers as any)?.contact_name && (
                        <p className="text-sm text-slate-500 mt-1">担当: {(order.customers as any).contact_name}</p>
                    )}
                </div>

                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                    <div className="flex items-center gap-2 text-slate-500 mb-3">
                        <Calendar size={16} />
                        <span className="text-xs font-bold uppercase tracking-wider">日程</span>
                    </div>
                    <div className="space-y-2 text-sm">
                        <p><span className="text-slate-400 font-medium mr-2">受注日</span><span className="font-bold text-slate-800">{order.order_date || '未定'}</span></p>
                        <p><span className="text-slate-400 font-medium mr-2">納品日</span><span className="font-bold text-slate-800">{order.delivery_date || '未定'}</span></p>
                    </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                    <div className="flex items-center gap-2 text-slate-500 mb-3">
                        <FileText size={16} />
                        <span className="text-xs font-bold uppercase tracking-wider">金額</span>
                    </div>
                    <p className="font-bold text-slate-900 text-2xl tracking-tight">¥{(order.total_amount || 0).toLocaleString()}</p>
                </div>
            </div>

            {/* Order Lines */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100">
                    <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <Package size={18} className="text-indigo-600" />
                        受注明細
                    </h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-600">
                        <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                            <tr>
                                <th className="font-medium py-3.5 px-6">#</th>
                                <th className="font-medium py-3.5 px-6">商品名</th>
                                <th className="font-medium py-3.5 px-6 text-right">数量</th>
                                <th className="font-medium py-3.5 px-6 text-right">単価</th>
                                <th className="font-medium py-3.5 px-6 text-right">小計</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {order.order_lines && (order.order_lines as any[]).length > 0 ? (
                                (order.order_lines as any[]).map((line: any, i: number) => (
                                    <tr key={line.id} className="hover:bg-slate-50/80 transition-colors">
                                        <td className="py-4 px-6 text-slate-400 font-mono">{line.line_no || i + 1}</td>
                                        <td className="py-4 px-6 font-semibold text-slate-900">
                                            {line.products?.product_name || '商品情報なし'}
                                            {line.products?.product_code && <span className="text-xs text-slate-400 ml-2 font-mono">({line.products.product_code})</span>}
                                        </td>
                                        <td className="py-4 px-6 text-right font-medium">{line.quantity || 0}</td>
                                        <td className="py-4 px-6 text-right">¥{(line.unit_price || 0).toLocaleString()}</td>
                                        <td className="py-4 px-6 text-right font-bold text-slate-900">¥{(line.amount || 0).toLocaleString()}</td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={5} className="py-12 text-center text-slate-500">
                                        <Package size={32} className="mx-auto text-slate-300 mb-3" />
                                        <p className="font-medium">この受注には明細行がまだ登録されていません</p>
                                        <p className="text-xs mt-1 text-slate-400">明細は別途追加が必要です</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                        {order.order_lines && (order.order_lines as any[]).length > 0 && (
                            <tfoot className="border-t-2 border-slate-200 bg-slate-50">
                                <tr>
                                    <td colSpan={4} className="py-4 px-6 text-right font-bold text-slate-600">合計</td>
                                    <td className="py-4 px-6 text-right font-bold text-xl text-indigo-700">¥{(order.total_amount || 0).toLocaleString()}</td>
                                </tr>
                            </tfoot>
                        )}
                    </table>
                </div>
            </div>

            {/* Notes */}
            {order.notes && (
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                    <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">備考・メモ</h2>
                    <p className="text-slate-700 whitespace-pre-wrap">{order.notes}</p>
                </div>
            )}
        </div>
    );
}
