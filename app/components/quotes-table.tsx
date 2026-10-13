'use client';

import Link from 'next/link';
import { Clipboard, FileOutput } from 'lucide-react';
import StatusChanger from '@/app/(dashboard)/components/status-changer';
import BulkDeleteTable from '@/app/components/bulk-delete-table';
import { bulkDeleteQuotes } from '@/app/actions/bulk-delete';

const QUOTE_STATUSES = [
    { label: '下書き', color: 'bg-slate-100 text-slate-700 border-slate-200' },
    { label: '送付済', color: 'bg-sky-100 text-sky-700 border-sky-200' },
    { label: '承認済', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
    { label: '失注', color: 'bg-rose-100 text-rose-700 border-rose-200' },
];

type QuoteRow = {
    id: string;
    quote_number: string | null;
    subject: string | null;
    total_amount: number | null;
    status: string | null;
    valid_until: string | null;
    customer_name: string | null;
};

export default function QuotesTable({
    quotes,
    statusFilter,
}: {
    quotes: QuoteRow[];
    statusFilter: string;
}) {
    return (
        <BulkDeleteTable
            ids={quotes.map(q => q.id)}
            deleteAction={bulkDeleteQuotes}
            entityName="見積書"
        >
            {({ selectedIds, toggleId, isAllSelected, toggleAll }) => (
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-600 whitespace-nowrap">
                        <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                            <tr>
                                <th className="py-3.5 px-4 w-10">
                                    <input
                                        type="checkbox"
                                        checked={isAllSelected}
                                        onChange={toggleAll}
                                        className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                    />
                                </th>
                                <th className="font-medium py-3.5 px-6">見積番号</th>
                                <th className="font-medium py-3.5 px-6">顧客名</th>
                                <th className="font-medium py-3.5 px-6">件名</th>
                                <th className="font-medium py-3.5 px-6 text-right">金額</th>
                                <th className="font-medium py-3.5 px-6">ステータス</th>
                                <th className="font-medium py-3.5 px-6">有効期限</th>
                                <th className="font-medium py-3.5 px-6 text-center">操作</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {quotes.length > 0 ? quotes.map((quote) => (
                                <tr key={quote.id} className={`hover:bg-slate-50 transition-colors ${selectedIds.has(quote.id) ? 'bg-indigo-50/50' : ''}`}>
                                    <td className="py-4 px-4">
                                        <input
                                            type="checkbox"
                                            checked={selectedIds.has(quote.id)}
                                            onChange={() => toggleId(quote.id)}
                                            className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                        />
                                    </td>
                                    <td className="py-4 px-6 font-mono text-xs text-slate-500">{quote.quote_number || '-'}</td>
                                    <td className="py-4 px-6 font-semibold text-slate-900">{quote.customer_name || '未紐付け'}</td>
                                    <td className="py-4 px-6">{quote.subject || '-'}</td>
                                    <td className="py-4 px-6 text-right font-bold">¥{(quote.total_amount || 0).toLocaleString()}</td>
                                    <td className="py-4 px-6">
                                        <StatusChanger
                                            id={quote.id}
                                            currentStatus={quote.status || '下書き'}
                                            statuses={QUOTE_STATUSES}
                                            type="quote"
                                        />
                                    </td>
                                    <td className="py-4 px-6 text-slate-500">{quote.valid_until || '-'}</td>
                                    <td className="py-4 px-6 text-center">
                                        <div className="flex justify-center gap-2">
                                            <Link href={`/quotes/${quote.id}`} className="inline-flex items-center gap-1.5 p-2 px-3 text-sky-600 bg-sky-50 hover:bg-sky-100 rounded-lg transition-all shadow-sm font-bold text-xs group">
                                                <Clipboard size={16} className="group-hover:scale-110 transition-transform" />
                                                プレビュー/PDF
                                            </Link>
                                            <Link href={`/invoices/new?quoteId=${quote.id}`} className="inline-flex items-center gap-1.5 p-2 px-3 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-all shadow-sm font-bold text-xs group">
                                                <FileOutput size={16} className="group-hover:scale-110 transition-transform" />
                                                請求書作成
                                            </Link>
                                        </div>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={8} className="py-16 text-center text-slate-400">
                                        <Clipboard size={40} className="mx-auto text-slate-300 mb-4" />
                                        <p className="font-bold text-slate-700 text-base">
                                            {statusFilter ? `「${statusFilter}」の見積書はありません` : '見積書がまだありません'}
                                        </p>
                                        <p className="text-sm mt-1 text-slate-500">
                                            {statusFilter ? '別のステータスで絞り込んでみてください' : '新規見積書を作成しましょう'}
                                        </p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </BulkDeleteTable>
    );
}
