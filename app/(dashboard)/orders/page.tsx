import { createClient } from '@/utils/supabase/server';
import { getCurrentCompanyId } from '@/utils/auth';
import { ShoppingBag, Plus } from 'lucide-react';
import Link from 'next/link';
import StatusFilter from '@/app/components/status-filter';
import OrdersTable from '@/app/components/orders-table';

export const dynamic = 'force-dynamic';

const ORDER_STATUSES = [
    { label: '取消済', color: 'bg-rose-100 text-rose-700 border-rose-200' },
    { label: '確認待ち', color: 'bg-amber-100 text-amber-700 border-amber-200' },
    { label: '新規受注', color: 'bg-amber-100 text-amber-700 border-amber-200' },
    { label: '受注確定', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
    { label: '出荷準備中', color: 'bg-sky-100 text-sky-700 border-sky-200' },
    { label: '納品済', color: 'bg-slate-100 text-slate-700 border-slate-200' },
];

export default async function OrdersPage({
    searchParams,
}: {
    searchParams: Promise<{ status?: string }>;
}) {
    const query = await searchParams;
    const supabase = await createClient();
    const companyId = await getCurrentCompanyId();

    let dbQuery = supabase
        .from('orders')
        .select(`*, customers (company_name)`)
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

    if (query.status) {
        dbQuery = dbQuery.eq('status', query.status);
    }

    const { data: orders } = await dbQuery;

    const serializedOrders = (orders || []).map(o => ({
        pos_sale_id: o.pos_sale_id || null,
        id: o.id,
        order_number: o.order_number,
        source_type: o.source_type,
        status: o.status,
        total_amount: o.total_amount,
        order_date: o.order_date,
        delivery_date: o.delivery_date,
        customer_name: (o.customers as any)?.company_name || null,
    }));

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">受注管理</h1>
                    <p className="text-slate-500 mt-1">受注データの一覧・ステータス追跡・管理</p>
                </div>
                <div className="flex items-center gap-3">
                    <Link href="/orders/new" className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl font-semibold transition-colors shadow-sm shadow-indigo-200">
                        <Plus size={18} />
                        <span>手動入力</span>
                    </Link>
                </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
                {/* Status Filter */}
                <div className="p-4 border-b border-slate-100">
                    <StatusFilter statuses={ORDER_STATUSES} />
                </div>

                <OrdersTable orders={serializedOrders} statusFilter={query.status || ''} />
            </div>
        </div>
    );
}
