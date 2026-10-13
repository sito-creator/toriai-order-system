import { createClient } from '@/utils/supabase/server';
import { getCurrentCompanyId } from '@/utils/auth';
import { Plus } from 'lucide-react';
import Link from 'next/link';
import StatusFilter from '@/app/components/status-filter';
import PurchasesTable from '@/app/components/purchases-table';

export const dynamic = 'force-dynamic';

const PURCHASE_STATUSES = [
    { label: '下書き', color: 'bg-slate-100 text-slate-700 border-slate-200' },
    { label: '承認待ち', color: 'bg-amber-100 text-amber-700 border-amber-200' },
    { label: '発注済', color: 'bg-sky-100 text-sky-700 border-sky-200' },
    { label: '入荷済', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
    { label: '検収済', color: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
    { label: 'キャンセル', color: 'bg-rose-50 text-rose-600 border-rose-200' },
];

export default async function PurchasesPage({
    searchParams,
}: {
    searchParams: Promise<{ status?: string }>;
}) {
    const query = await searchParams;
    const supabase = await createClient();
    const companyId = await getCurrentCompanyId();

    let dbQuery = supabase
        .from('purchases')
        .select(`*, suppliers (company_name)`)
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

    if (query.status) {
        dbQuery = dbQuery.eq('status', query.status);
    }

    const { data: purchases } = await dbQuery;

    const serializedPurchases = (purchases || []).map((p: any) => ({
        id: p.id,
        purchase_number: p.purchase_number,
        status: p.status,
        total_amount: p.total_amount,
        desired_delivery_date: p.desired_delivery_date,
        supplier_name: p.suppliers?.company_name || null,
    }));

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">発注管理</h1>
                    <p className="text-slate-500 mt-1">仕入先への発注データ作成とステータス追跡</p>
                </div>
                <div className="flex items-center gap-3">
                    <Link href="/purchases/new" className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl font-semibold transition-colors shadow-sm shadow-indigo-200">
                        <Plus size={18} />
                        <span>新規発注を作成</span>
                    </Link>
                </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
                {/* Status Filter */}
                <div className="p-4 border-b border-slate-100">
                    <StatusFilter statuses={PURCHASE_STATUSES} />
                </div>

                <PurchasesTable purchases={serializedPurchases} statusFilter={query.status || ''} />
            </div>
        </div>
    );
}
