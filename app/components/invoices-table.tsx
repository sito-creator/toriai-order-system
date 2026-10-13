'use client';

import Link from 'next/link';
import { FileOutput } from 'lucide-react';
import StatusChanger from '@/app/(dashboard)/components/status-changer';
import BulkDeleteTable from '@/app/components/bulk-delete-table';
import { bulkDeleteInvoices } from '@/app/actions/bulk-delete';

const INVOICE_STATUSES = [
    { label: '下書き', color: 'bg-slate-100 text-slate-700 border-slate-200' },
    { label: '発行済', color: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
    { label: '送付済', color: 'bg-sky-100 text-sky-700 border-sky-200' },
    { label: '入金済', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
    { label: '期日超過', color: 'bg-rose-100 text-rose-700 border-rose-200' },
];

type InvoiceRow = {
    id: string;
    invoice_number: string | null;
    status: string | null;
    total_amount: number | null;
    issue_date: string | null;
    due_date: string | null;
    customer_name: string | null;
};

export default function InvoicesTable({
    invoices,
    statusFilter,
}: {
    invoices: InvoiceRow[];
    statusFilter: string;
}) {
    return (
        <BulkDeleteTable
            ids={invoices.map(i => i.id)}
            deleteAction={bulkDeleteInvoices}
            entityName="請求書"
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
                                <th className="font-medium py-3.5 px-6">請求情報</th>
                                <th className="font-medium py-3.5 px-6">ステータス</th>
                                <th className="font-medium py-3.5 px-6 text-right">請求金額 (税込)</th>
                                <th className="font-medium py-3.5 px-6">対象期間 / 期日</th>
                                <th className="font-medium py-3.5 px-6 text-center">PDF出力</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {invoices.length > 0 ? (
                                invoices.map((invoice) => (
                                    <tr key={invoice.id} className={`hover:bg-slate-50/80 transition-colors ${selectedIds.has(invoice.id) ? 'bg-indigo-50/50' : ''}`}>
                                        <td className="py-4 px-4">
                                            <input
                                                type="checkbox"
                                                checked={selectedIds.has(invoice.id)}
                                                onChange={() => toggleId(invoice.id)}
                                                className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                            />
                                        </td>
                                        <td className="py-4 px-6">
                                            <div className="font-semibold text-slate-900 mb-1">{invoice.invoice_number || '未発番'}</div>
                                            <div className="text-sm font-medium text-slate-600">{invoice.customer_name || '名称未設定'}</div>
                                        </td>
                                        <td className="py-4 px-6">
                                            <StatusChanger
                                                id={invoice.id}
                                                currentStatus={invoice.status || '下書き'}
                                                statuses={INVOICE_STATUSES}
                                                type="invoice"
                                            />
                                        </td>
                                        <td className="py-4 px-6 text-right font-bold text-slate-900 text-base">
                                            ¥{(invoice.total_amount || 0).toLocaleString()}
                                        </td>
                                        <td className="py-4 px-6 text-xs text-slate-600">
                                            <div className="space-y-1.5">
                                                <p><span className="text-slate-400 mr-2 font-medium">発</span>{invoice.issue_date || '未定'}</p>
                                                <p className={invoice.status === '期日超過' ? 'text-red-600 font-bold' : ''}><span className="text-slate-400 mr-2 font-medium">期</span>{invoice.due_date || '未定'}</p>
                                            </div>
                                        </td>
                                        <td className="py-4 px-6 text-center">
                                            <Link href={`/invoices/${invoice.id}`} className="inline-flex items-center gap-1.5 p-2 px-3 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 hover:-translate-y-0.5 rounded-lg transition-all shadow-sm font-bold text-xs">
                                                <FileOutput size={16} />
                                                プレビュー/PDF
                                            </Link>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={6} className="py-16 text-center text-slate-500">
                                        <p className="font-bold text-slate-700 text-base">
                                            {statusFilter ? `「${statusFilter}」の請求書はありません` : '請求書データがありません'}
                                        </p>
                                        <p className="text-sm mt-1 text-slate-500">
                                            {statusFilter ? '別のステータスで絞り込んでみてください' : '受注データから請求書を自動作成するか、手動で新規作成してください'}
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
