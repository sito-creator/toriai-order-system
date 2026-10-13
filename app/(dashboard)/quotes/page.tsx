import { createClient } from '@/utils/supabase/server';
import { getCurrentCompanyId } from '@/utils/auth';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import StatusFilter from '@/app/components/status-filter';
import QuotesTable from '@/app/components/quotes-table';

const QUOTE_STATUSES = [
    { label: '下書き', color: 'bg-slate-100 text-slate-700 border-slate-200' },
    { label: '送付済', color: 'bg-sky-100 text-sky-700 border-sky-200' },
    { label: '承認済', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
    { label: '失注', color: 'bg-rose-100 text-rose-700 border-rose-200' },
];

export const dynamic = 'force-dynamic';

export default async function QuotesPage({
    searchParams,
}: {
    searchParams: Promise<{ status?: string }>;
}) {
    const query = await searchParams;
    const supabase = await createClient();
    const companyId = await getCurrentCompanyId();

    let dbQuery = supabase
        .from('quotes')
        .select('*, customers ( company_name )')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

    if (query.status) {
        dbQuery = dbQuery.eq('status', query.status);
    }

    const { data: quotes } = await dbQuery;

    const serializedQuotes = (quotes || []).map((q: any) => ({
        id: q.id,
        quote_number: q.quote_number,
        subject: q.subject,
        total_amount: q.total_amount,
        status: q.status,
        valid_until: q.valid_until,
        customer_name: q.customers?.company_name || null,
    }));

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
                {/* Status Filter */}
                <div className="p-4 border-b border-slate-100">
                    <StatusFilter statuses={QUOTE_STATUSES} />
                </div>

                <QuotesTable quotes={serializedQuotes} statusFilter={query.status || ''} />
            </div>
        </div>
    );
}
