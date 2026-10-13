import { createClient } from '@/utils/supabase/server';
import { getCurrentCompanyId } from '@/utils/auth';
import { revalidatePath } from 'next/cache';
import { CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import BankCsvImport from './bank-csv-import';
import { UnpaidTable, PaidTable } from '@/app/components/payments-table';

export const dynamic = 'force-dynamic';

export default async function PaymentsPage() {
    const supabase = await createClient();
    const companyId = await getCurrentCompanyId();

    const { data: invoices } = await supabase
        .from('invoices')
        .select('*, customers(company_name)')
        .eq('company_id', companyId)
        .order('due_date', { ascending: true });

    const unpaidInvoices = invoices?.filter(inv => inv.status !== '入金済') || [];
    const paidInvoices = invoices?.filter(inv => inv.status === '入金済') || [];

    const totalUnpaid = unpaidInvoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0);
    const totalPaid = paidInvoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0);
    const overdueInvoices = unpaidInvoices.filter(inv => inv.due_date && new Date(inv.due_date) < new Date());
    const totalOverdue = overdueInvoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0);

    // Server Actions
    async function markAsPaid(formData: FormData) {
        'use server';
        const supabase = await createClient();
        const invoiceId = formData.get('invoice_id') as string;
        await supabase.from('invoices').update({ status: '入金済' }).eq('id', invoiceId);
        revalidatePath('/payments');
        revalidatePath('/invoices');
    }

    async function markAsUnpaid(formData: FormData) {
        'use server';
        const supabase = await createClient();
        const invoiceId = formData.get('invoice_id') as string;
        await supabase.from('invoices').update({ status: '発行済' }).eq('id', invoiceId);
        revalidatePath('/payments');
        revalidatePath('/invoices');
    }

    // BankCsvImport用のシリアライズ可能データ
    const unpaidForImport = unpaidInvoices.map(inv => ({
        id: inv.id,
        invoice_number: inv.invoice_number || '未発番',
        total_amount: inv.total_amount || 0,
        customer_name: (inv.customers as any)?.company_name || '-',
        due_date: inv.due_date || '',
    }));

    // テーブルコンポーネント用のシリアライズ可能データ
    const serializedUnpaid = unpaidInvoices.map(inv => ({
        id: inv.id,
        invoice_number: inv.invoice_number,
        status: inv.status,
        total_amount: inv.total_amount,
        due_date: inv.due_date,
        issue_date: inv.issue_date,
        customer_name: (inv.customers as any)?.company_name || null,
    }));

    const serializedPaid = paidInvoices.map(inv => ({
        id: inv.id,
        invoice_number: inv.invoice_number,
        status: inv.status,
        total_amount: inv.total_amount,
        due_date: inv.due_date,
        issue_date: inv.issue_date,
        customer_name: (inv.customers as any)?.company_name || null,
    }));

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">入金・消込管理</h1>
                    <p className="text-slate-500 mt-1">手動または銀行CSVインポートで請求書の入金消し込みを行います</p>
                </div>
                <BankCsvImport unpaidInvoices={unpaidForImport} />
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                    <div className="flex items-center gap-2 text-slate-500 mb-2">
                        <AlertCircle size={16} className="text-amber-500" />
                        <span className="text-xs font-bold uppercase tracking-wider">未入金</span>
                    </div>
                    <p className="text-2xl font-bold text-slate-900">¥{totalUnpaid.toLocaleString()}</p>
                    <p className="text-xs text-slate-500 mt-1">{unpaidInvoices.length}件の請求書</p>
                </div>
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                    <div className="flex items-center gap-2 text-slate-500 mb-2">
                        <AlertCircle size={16} className="text-rose-500" />
                        <span className="text-xs font-bold uppercase tracking-wider">期日超過</span>
                    </div>
                    <p className="text-2xl font-bold text-rose-600">¥{totalOverdue.toLocaleString()}</p>
                    <p className="text-xs text-slate-500 mt-1">{overdueInvoices.length}件</p>
                </div>
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                    <div className="flex items-center gap-2 text-slate-500 mb-2">
                        <CheckCircle2 size={16} className="text-emerald-500" />
                        <span className="text-xs font-bold uppercase tracking-wider">入金済</span>
                    </div>
                    <p className="text-2xl font-bold text-emerald-600">¥{totalPaid.toLocaleString()}</p>
                    <p className="text-xs text-slate-500 mt-1">{paidInvoices.length}件の請求書</p>
                </div>
            </div>

            {/* 未入金一覧 */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                    <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <Clock size={18} className="text-amber-500" /> 未入金の請求書
                    </h2>
                    <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-full">{unpaidInvoices.length}件</span>
                </div>
                <UnpaidTable invoices={serializedUnpaid} markAsPaidAction={markAsPaid} />
            </div>

            {/* 入金済一覧 */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                    <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <CheckCircle2 size={18} className="text-emerald-500" /> 入金済の請求書
                    </h2>
                    <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-full">{paidInvoices.length}件</span>
                </div>
                <PaidTable invoices={serializedPaid} markAsUnpaidAction={markAsUnpaid} />
            </div>
        </div>
    );
}
