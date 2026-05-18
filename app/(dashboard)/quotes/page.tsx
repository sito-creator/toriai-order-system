import { createClient } from '@/utils/supabase/server';
import Link from 'next/link';
import { Clipboard, Plus, Search, ArrowRight, Clock, CheckCircle2, Send } from 'lucide-react';

export default async function QuotesPage() {
    const supabase = await createClient();
    const { data: quotes } = await supabase
        .from('quotes')
        .select('*, customers ( company_name )')
        .order('created_at', { ascending: false });

    const getStatusColor = (status: string) => {
        switch (status) {
            case '下書き': return 'bg-slate-100 text-slate-700 border-slate-200';
            case '送付済': return 'bg-sky-100 text-sky-700 border-sky-200';
            case '承認済': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
            case '失注': return 'bg-rose-100 text-rose-700 border-rose-200';
            default: return 'bg-slate-100 text-slate-600 border-slate-200';
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">見積書管理</h1>
                    <p className="text-slate-500 mt-1">見積書の作成・送付・管理</p>
                </div>
                <Link href="/quotes/new" className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl font-semibold transition-colors shadow-sm shadow-indigo-200">
                    <Plus size={18} />
                    <span>新規見積書</span>
                </Link>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-600 whitespace-nowrap">
                        <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                            <tr>
                                <th className="font-medium py-3.5 px-6">見積番号</th>
                                <th className="font-medium py-3.5 px-6">顧客名</th>
                                <th className="font-medium py-3.5 px-6">件名</th>
                                <th className="font-medium py-3.5 px-6 text-right">金額</th>
                                <th className="font-medium py-3.5 px-6">ステータス</th>
                                <th className="font-medium py-3.5 px-6">有効期限</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {quotes && quotes.length > 0 ? quotes.map((quote: any) => (
                                <tr key={quote.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="py-4 px-6 font-mono text-xs text-slate-500">{quote.quote_number || '-'}</td>
                                    <td className="py-4 px-6 font-semibold text-slate-900">{(quote.customers as any)?.company_name || '未紐付け'}</td>
                                    <td className="py-4 px-6">{quote.subject || '-'}</td>
                                    <td className="py-4 px-6 text-right font-bold">¥{(quote.total_amount || 0).toLocaleString()}</td>
                                    <td className="py-4 px-6">
                                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${getStatusColor(quote.status)}`}>
                                            {quote.status}
                                        </span>
                                    </td>
                                    <td className="py-4 px-6 text-slate-500">{quote.valid_until || '-'}</td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={6} className="py-16 text-center text-slate-400">
                                        <Clipboard size={40} className="mx-auto text-slate-300 mb-4" />
                                        <p className="font-bold text-slate-700 text-base">見積書がまだありません</p>
                                        <p className="text-sm mt-1 mb-6 text-slate-500">新規見積書を作成しましょう</p>
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
