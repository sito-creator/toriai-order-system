'use client';

import Link from 'next/link';
import { Banknote, FileText, Clock, AlertCircle, CheckCircle2 } from 'lucide-react';
import BulkDeleteTable from '@/app/components/bulk-delete-table';
import { bulkDeletePaymentInvoices } from '@/app/actions/bulk-delete';

type PaymentInvoiceRow = {
    id: string;
    invoice_number: string | null;
    status: string | null;
    total_amount: number | null;
    due_date: string | null;
    issue_date: string | null;
    customer_name: string | null;
};

function getStatusConfig(status: string) {
    switch (status) {
        case '下書き': return { color: 'bg-slate-100 text-slate-700 border-slate-200', icon: <FileText size={12} /> };
        case '発行済': return { color: 'bg-sky-100 text-sky-700 border-sky-200', icon: <Clock size={12} /> };
        case '送付済': return { color: 'bg-indigo-100 text-indigo-700 border-indigo-200', icon: <Clock size={12} /> };
        case '期日超過': return { color: 'bg-rose-100 text-rose-700 border-rose-200', icon: <AlertCircle size={12} /> };
        default: return { color: 'bg-slate-100 text-slate-600 border-slate-200', icon: null };
    }
}

function isOverdue(d: string | null) {
    return d ? new Date(d) < new Date() : false;
}

export function UnpaidTable({
    invoices,
    markAsPaidAction,
}: {
    invoices: PaymentInvoiceRow[];
    markAsPaidAction: (formData: FormData) => Promise<void>;
}) {
    return (
        <BulkDeleteTable
            ids={invoices.map(i => i.id)}
            deleteAction={bulkDeletePaymentInvoices}
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
                                <th className="font-medium py-3.5 px-6">請求書番号</th>
                                <th className="font-medium py-3.5 px-6">取引先</th>
                                <th className="font-medium py-3.5 px-6">ステータス</th>
                                <th className="font-medium py-3.5 px-6 text-right">請求金額</th>
                                <th className="font-medium py-3.5 px-6">支払期日</th>
                                <th className="font-medium py-3.5 px-6 text-center">手動消込</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {invoices.length > 0 ? invoices.map(invoice => {
                                const overdue = isOverdue(invoice.due_date);
                                const sc = getStatusConfig(overdue ? '期日超過' : (invoice.status || ''));
                                return (
                                    <tr key={invoice.id} className={`hover:bg-slate-50/80 transition-colors ${overdue ? 'bg-rose-50/30' : ''} ${selectedIds.has(invoice.id) ? 'bg-indigo-50/50' : ''}`}>
                                        <td className="py-4 px-4">
                                            <input
                                                type="checkbox"
                                                checked={selectedIds.has(invoice.id)}
                                                onChange={() => toggleId(invoice.id)}
                                                className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                            />
                                        </td>
                                        <td className="py-4 px-6">
                                            <Link href={`/invoices/${invoice.id}`} className="font-semibold text-indigo-600 hover:text-indigo-800 hover:underline">
                                                {invoice.invoice_number || '未発番'}
                                            </Link>
                                        </td>
                                        <td className="py-4 px-6 font-medium text-slate-900">{invoice.customer_name || '-'}</td>
                                        <td className="py-4 px-6">
                                            <span className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-bold border ${sc.color}`}>
                                                {sc.icon} {overdue ? '期日超過' : invoice.status || '下書き'}
                                            </span>
                                        </td>
                                        <td className="py-4 px-6 text-right font-bold text-slate-900 text-base">¥{(invoice.total_amount || 0).toLocaleString()}</td>
                                        <td className={`py-4 px-6 font-medium ${overdue ? 'text-rose-600 font-bold' : 'text-slate-700'}`}>
                                            {invoice.due_date || '未定'}
                                            {overdue && <span className="ml-2 text-[10px] bg-rose-100 text-rose-600 px-1.5 py-0.5 rounded font-bold">超過</span>}
                                        </td>
                                        <td className="py-4 px-6 text-center">
                                            <form action={markAsPaidAction}>
                                                <input type="hidden" name="invoice_id" value={invoice.id} />
                                                <button type="submit" className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-all hover:-translate-y-0.5 shadow-sm">
                                                    <Banknote size={14} /> 入金消込
                                                </button>
                                            </form>
                                        </td>
                                    </tr>
                                );
                            }) : (
                                <tr>
                                    <td colSpan={7} className="py-16 text-center text-slate-500">
                                        <CheckCircle2 size={40} className="mx-auto text-emerald-300 mb-4" />
                                        <p className="font-bold text-slate-700 text-base">未入金の請求書はありません</p>
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

export function PaidTable({
    invoices,
    markAsUnpaidAction,
}: {
    invoices: PaymentInvoiceRow[];
    markAsUnpaidAction: (formData: FormData) => Promise<void>;
}) {
    return (
        <BulkDeleteTable
            ids={invoices.map(i => i.id)}
            deleteAction={bulkDeletePaymentInvoices}
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
                                <th className="font-medium py-3.5 px-6">請求書番号</th>
                                <th className="font-medium py-3.5 px-6">取引先</th>
                                <th className="font-medium py-3.5 px-6 text-right">請求金額</th>
                                <th className="font-medium py-3.5 px-6">発行日</th>
                                <th className="font-medium py-3.5 px-6 text-center">取消</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {invoices.length > 0 ? invoices.map(invoice => (
                                <tr key={invoice.id} className={`hover:bg-slate-50/80 transition-colors ${selectedIds.has(invoice.id) ? 'bg-indigo-50/50' : ''}`}>
                                    <td className="py-3 px-4">
                                        <input
                                            type="checkbox"
                                            checked={selectedIds.has(invoice.id)}
                                            onChange={() => toggleId(invoice.id)}
                                            className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                        />
                                    </td>
                                    <td className="py-3 px-6"><Link href={`/invoices/${invoice.id}`} className="font-semibold text-indigo-600 hover:text-indigo-800 hover:underline text-sm">{invoice.invoice_number || '未発番'}</Link></td>
                                    <td className="py-3 px-6 font-medium text-slate-900 text-sm">{invoice.customer_name || '-'}</td>
                                    <td className="py-3 px-6 text-right font-bold text-slate-700">¥{(invoice.total_amount || 0).toLocaleString()}</td>
                                    <td className="py-3 px-6 text-slate-500 text-sm">{invoice.issue_date || '-'}</td>
                                    <td className="py-3 px-6 text-center">
                                        <form action={markAsUnpaidAction}>
                                            <input type="hidden" name="invoice_id" value={invoice.id} />
                                            <button type="submit" className="text-xs font-bold text-slate-500 hover:text-rose-600 bg-slate-50 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 px-2.5 py-1.5 rounded-lg transition-colors">取消</button>
                                        </form>
                                    </td>
                                </tr>
                            )) : (
                                <tr><td colSpan={6} className="py-10 text-center text-slate-400"><p className="text-sm">入金済の請求書はまだありません</p></td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </BulkDeleteTable>
    );
}
