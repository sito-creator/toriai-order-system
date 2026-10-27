'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import OrderStatusSelector from '@/app/components/order-status-selector';
import BulkDeleteTable from '@/app/components/bulk-delete-table';
import { bulkDeleteOrders } from '@/app/actions/bulk-delete';

type OrderRow = {
    pos_sale_id: string | null;
    id: string;
    order_number: string | null;
    source_type: string | null;
    status: string;
    total_amount: number | null;
    order_date: string | null;
    delivery_date: string | null;
    customer_name: string | null;
};

export default function OrdersTable({
    orders,
    statusFilter,
}: {
    orders: OrderRow[];
    statusFilter: string;
}) {
    return (
        <BulkDeleteTable
            ids={orders.filter(o => !o.pos_sale_id).map(o => o.id)}
            deleteAction={bulkDeleteOrders}
            entityName="受注データ"
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
                                <th className="font-medium py-3.5 px-6">受注番号 / 経路</th>
                                <th className="font-medium py-3.5 px-6">顧客名</th>
                                <th className="font-medium py-3.5 px-6">ステータス</th>
                                <th className="font-medium py-3.5 px-6 text-right">受注金額</th>
                                <th className="font-medium py-3.5 px-6">日程</th>
                                <th className="font-medium py-3.5 px-6 text-center">詳細</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {orders.length > 0 ? (
                                orders.map((order) => (
                                    <tr key={order.id} className={`hover:bg-slate-50/80 transition-colors ${selectedIds.has(order.id) ? 'bg-indigo-50/50' : ''}`}>
                                        <td className="py-4 px-4">
                                            <input
                                                type="checkbox"
                                                checked={selectedIds.has(order.id)}
                                                disabled={!!order.pos_sale_id}
                                                onChange={() => toggleId(order.id)}
                                                className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                            />
                                        </td>
                                        <td className="py-4 px-6">
                                            <div className="flex flex-col gap-1.5">
                                                <span className="font-semibold text-slate-900">{order.order_number || '----------'}</span>
                                                <span className="text-[11px] font-semibold px-2 py-0.5 rounded border border-slate-200 bg-slate-50 text-slate-500 w-fit">
                                                    {order.source_type || '手入力'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="py-4 px-6 font-semibold text-slate-800">
                                            {order.customer_name || <span className="text-slate-400 font-normal">{order.pos_sale_id ? '店頭のお客様' : '名称未設定'}</span>}
                                        </td>
                                        <td className="py-4 px-6">
                                            {order.pos_sale_id ? <span>{order.status}（POS同期）</span> : <OrderStatusSelector orderId={order.id} initialStatus={order.status} />}
                                        </td>
                                        <td className="py-4 px-6 text-right font-bold text-slate-900 text-base">
                                            ¥{(order.total_amount || 0).toLocaleString()}
                                        </td>
                                        <td className="py-4 px-6 text-xs text-slate-600">
                                            <div className="space-y-1.5">
                                                <p><span className="text-slate-400 mr-2 font-medium">受</span>{order.order_date || '未定'}</p>
                                                <p><span className="text-slate-400 mr-2 font-medium">納</span>{order.delivery_date || '未定'}</p>
                                            </div>
                                        </td>
                                        <td className="py-4 px-6 text-center">
                                            <Link href={`/orders/${order.id}`} className="inline-flex items-center justify-center p-2 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-all hover:scale-105 active:scale-95">
                                                <ArrowRight size={18} />
                                            </Link>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={7} className="py-16 text-center text-slate-500">
                                        <p className="font-bold text-slate-700 text-base">
                                            {statusFilter ? `「${statusFilter}」の受注データはありません` : '受注データがありません'}
                                        </p>
                                        <p className="text-sm mt-1 text-slate-500">
                                            {statusFilter ? '別のステータスで絞り込んでみてください' : '新規の注文を入力して管理を始めましょう'}
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
