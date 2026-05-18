import { createClient } from '@/utils/supabase/server';
import Link from 'next/link';
import { FileText, Search, Plus, Filter, FileOutput, CheckCircle2, Clock, AlertCircle } from 'lucide-react';

export default async function InvoicesPage() {
    const supabase = await createClient();
    const { data: invoices } = await supabase.from('invoices').select('*, customers(company_name)').order('created_at', { ascending: false });

    const getStatusColor = (status: string) => {
        switch (status) {
            case '下書き': return 'bg-slate-100 text-slate-700 border-slate-200';
            case '発行済': return 'bg-sky-100 text-sky-700 border-sky-200';
            case '送付済': return 'bg-indigo-100 text-indigo-700 border-indigo-200';
            case '入金済': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
            case '期日超過': return 'bg-rose-100 text-rose-700 border-rose-200';
            default: return 'bg-slate-100 text-slate-600 border-slate-200';
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">適格請求書(インボイス)管理</h1>
                    <p className="text-slate-500 mt-1">適格請求書の作成・PDF出力・送付状況の追跡</p>
                </div>
                <div className="flex items-center gap-3">
                    <button className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl font-medium transition-colors shadow-sm shadow-indigo-200">
                        <Plus size={18} /><span>新規作成</span>
                    </button>
                </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
                {/* Toolbar */}
                <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-4">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input type="text" placeholder="請求書番号や顧客名で検索..." className="w-full bg-slate-50 outline-none hover:bg-slate-100/50 border border-slate-200 text-slate-900 rounded-lg py-2.5 pl-10 pr-4 focus:bg-white focus:border-indigo-500 focus:ring-2 text-sm" />
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-600 whitespace-nowrap">
                        <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                            <tr>
                                <th className="font-medium py-3.5 px-6">請求情報</th>
                                <th className="font-medium py-3.5 px-6">ステータス</th>
                                <th className="font-medium py-3.5 px-6 text-right">請求金額 (税込)</th>
                                <th className="font-medium py-3.5 px-6">対象期間 / 期日</th>
                                <th className="font-medium py-3.5 px-6 text-center">PDF出力</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {invoices && invoices.length > 0 ? (
                                invoices.map((invoice) => (
                                    <tr key={invoice.id} className="hover:bg-slate-50/80 transition-colors">
                                        <td className="py-4 px-6">
                                            <div className="font-semibold text-slate-900 mb-1">{invoice.invoice_number || '未発番'}</div>
                                            <div className="text-sm font-medium text-slate-600">{(invoice.customers as any)?.company_name || '名称未設定'}</div>
                                        </td>
                                        <td className="py-4 px-6">
                                            <span className={`px-2.5 py-1.5 rounded-full text-xs font-bold border ${getStatusColor(invoice.status)}`}>
                                                {invoice.status || '下書き'}
                                            </span>
                                        </td>
                                        <td className="py-4 px-6 text-right font-bold text-slate-900 text-base">
                                            ¥{(invoice.grand_total || 0).toLocaleString()}
                                        </td>
                                        <td className="py-4 px-6 text-xs text-slate-600">
                                            <div className="space-y-1.5">
                                                <p><span className="text-slate-400 mr-2 font-medium">発</span>{invoice.issue_date || '未定'}</p>
                                                <p className={invoice.status === '期日超過' ? 'text-red-600 font-bold' : ''}><span className="text-slate-400 mr-2 font-medium">期</span>{invoice.due_date || '未定'}</p>
                                            </div>
                                        </td>
                                        <td className="py-4 px-6 text-center">
                                            <Link href={`/invoices/${invoice.id}`} className="inline-flex p-2 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 hover:-translate-y-0.5 rounded-lg transition-all shadow-sm">
                                                <FileOutput size={18} />
                                            </Link>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={5} className="py-16 text-center text-slate-500">
                                        <FileText size={40} className="mx-auto text-slate-300 mb-4" />
                                        <p className="font-bold text-slate-700 text-base">請求書データがありません</p>
                                        <p className="text-sm mt-1 mb-6 text-slate-500">受注データから請求書を自動作成するか、手動で新規作成してください</p>
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
