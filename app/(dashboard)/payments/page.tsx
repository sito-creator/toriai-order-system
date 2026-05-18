import { createClient } from '@/utils/supabase/server';
import { CreditCard, Search, Link as LinkIcon, AlertCircle, CheckCircle2 } from 'lucide-react';

export default async function PaymentsPage() {
    const supabase = await createClient();
    const { data: payments } = await supabase.from('payments').select('*, invoices(invoice_number, customers(company_name))').order('created_at', { ascending: false });

    const getMatchStatusColor = (status: string) => {
        switch (status) {
            case '未消込': return 'bg-rose-100 text-rose-700 border-rose-200';
            case '一部消込': return 'bg-amber-100 text-amber-700 border-amber-200';
            case '消込済': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
            default: return 'bg-slate-100 text-slate-600 border-slate-200';
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">入金・消込管理</h1>
                    <p className="text-slate-500 mt-1">銀行入金データと請求書の自動・手動マッチングによる入金消込処理</p>
                </div>
                <button className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-4 py-2.5 rounded-xl font-medium transition-colors shadow-sm">
                    <span>銀行CSVインポート</span>
                </button>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
                <div className="p-4 border-b border-slate-100">
                    <div className="relative max-w-md">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input type="text" placeholder="振込人名義や金額で検索..." className="w-full bg-slate-50 outline-none border border-slate-200 text-slate-900 rounded-lg py-2.5 pl-10 pr-4 focus:bg-white focus:border-indigo-500 focus:ring-2 text-sm" />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-600 whitespace-nowrap">
                        <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                            <tr>
                                <th className="font-medium py-3.5 px-6">入金日</th>
                                <th className="font-medium py-3.5 px-6">振込人名義 (自動取得)</th>
                                <th className="font-medium py-3.5 px-6 text-right">入金額</th>
                                <th className="font-medium py-3.5 px-6">消込状況</th>
                                <th className="font-medium py-3.5 px-6">紐付き請求書（取引先）</th>
                                <th className="font-medium py-3.5 px-6 text-center">手動消込</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {payments && payments.length > 0 ? (
                                payments.map(payment => (
                                    <tr key={payment.id} className="hover:bg-slate-50/80 transition">
                                        <td className="py-4 px-6">{payment.payment_date || '-'}</td>
                                        <td className="py-4 px-6 font-semibold text-slate-900">{payment.payer_name}</td>
                                        <td className="py-4 px-6 text-right font-bold text-indigo-700 text-base">
                                            ¥{(payment.amount || 0).toLocaleString()}
                                        </td>
                                        <td className="py-4 px-6">
                                            <span className={`px-2.5 py-1.5 rounded-full text-xs font-bold border ${getMatchStatusColor(payment.match_status)}`}>
                                                {payment.match_status || '未消込'}
                                            </span>
                                        </td>
                                        <td className="py-4 px-6 text-xs text-slate-500">
                                            {payment.invoices ? (
                                                <div className="font-medium text-slate-800 flex items-center gap-1.5">
                                                    <CheckCircle2 size={14} className="text-emerald-500" />
                                                    <span>{(payment.invoices as any).invoice_number} ({(payment.invoices as any).customers.company_name})</span>
                                                </div>
                                            ) : (
                                                <span className="text-rose-500 bg-rose-50 px-2 py-1 rounded inline-flex font-semibold items-center gap-1.5"><AlertCircle size={14} />未選択・迷子</span>
                                            )}
                                        </td>
                                        <td className="py-4 px-6 text-center">
                                            <button className="inline-flex items-center text-slate-400 hover:text-indigo-600 bg-slate-50 hover:bg-indigo-50 p-2 rounded-lg transition-colors"><LinkIcon size={18} /></button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={6} className="py-16 text-center text-slate-500">
                                        <CreditCard size={40} className="mx-auto text-slate-300 mb-4" />
                                        <p className="font-bold text-slate-700 text-base">入金データがありません</p>
                                        <p className="text-sm mt-1 mb-6 text-slate-500">銀行のCSVデータをインポートすると実際の入金実績が表示されます</p>
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
