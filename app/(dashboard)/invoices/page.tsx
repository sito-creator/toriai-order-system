import { createClient } from '@/utils/supabase/server';
import { getCurrentCompanyId } from '@/utils/auth';
import Link from 'next/link';
import { Plus, Search } from 'lucide-react';
import StatusFilter from '@/app/components/status-filter';
import InvoicesTable from '@/app/components/invoices-table';
import { isPostedInvoice } from '@/utils/accounting-status';
import { isInvoiceOverdue } from '@/utils/business-date';

const INVOICE_STATUSES = [
    { label: '下書き', color: 'bg-slate-100 text-slate-700 border-slate-200' },
    { label: '発行済', color: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
    { label: '送付済', color: 'bg-sky-100 text-sky-700 border-sky-200' },
    { label: '入金済', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
    { label: '期日超過', color: 'bg-rose-100 text-rose-700 border-rose-200' },
];

export const dynamic = 'force-dynamic';

export default async function InvoicesPage({
    searchParams,
}: {
    searchParams: Promise<{ status?: string }>;
}) {
    const query = await searchParams;
    const supabase = await createClient();
    const companyId = await getCurrentCompanyId();

    const dbQuery = supabase
        .from('invoices')
        .select('*, customers(company_name)')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

    const { data: invoices } = await dbQuery;
    const now = new Date();

    const serializedInvoices = (invoices || []).map((inv: any) => ({
        id: inv.id,
        invoice_number: inv.invoice_number,
        // Derive overdue using the same JST date rule as the payments screen.
        // Do not change stored status, or include drafts and paid invoices.
        status: isPostedInvoice(inv) && inv.status !== '入金済' && isInvoiceOverdue(inv.due_date, now)
            ? '期日超過' : inv.status,
        total_amount: inv.total_amount,
        issue_date: inv.issue_date,
        due_date: inv.due_date,
        customer_name: inv.customers?.company_name || null,
    })).filter(inv => !query.status || inv.status === query.status);

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">適格請求書(インボイス)管理</h1>
                    <p className="text-slate-500 mt-1">適格請求書の作成・PDF出力・送付状況の追跡</p>
                </div>
                <div className="flex items-center gap-3">
                    <Link href="/invoices/new" className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl font-medium transition-colors shadow-sm shadow-indigo-200">
                        <Plus size={18} /><span>新規作成</span>
                    </Link>
                </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
                {/* Toolbar */}
                <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                    <StatusFilter statuses={INVOICE_STATUSES} />
                </div>

                <InvoicesTable invoices={serializedInvoices} statusFilter={query.status || ''} />
            </div>
        </div>
    );
}
