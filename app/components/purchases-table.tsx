'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import PurchaseStatusSelector from '@/app/components/purchase-status-selector';
import BulkDeleteTable from '@/app/components/bulk-delete-table';
import { bulkDeletePurchases } from '@/app/actions/bulk-delete';

type PurchaseRow = {
    id: string;
    purchase_number: string | null;
    status: string;
    total_amount: number | null;
    desired_delivery_date: string | null;
    supplier_name: string | null;
};

export default function PurchasesTable({
    purchases,
    statusFilter,
}: {
    purchases: PurchaseRow[];
    statusFilter: string;
}) {
    return (
        <BulkDeleteTable
            ids={purchases.map(p => p.id)}
            deleteAction={bulkDeletePurchases}
            entityName="発注データ"
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
                                <th className="font-medium py-3.5 px-6">発注番号</th>
                                <th className="font-medium py-3.5 px-6">仕入先 / 外注先</th>
                                <th className="font-medium py-3.5 px-6">ステータス</th>
                                <th className="font-medium py-3.5 px-6 text-right">発注金額</th>
                                <th className="font-medium py-3.5 px-6">希望納期</th>
                                <th className="font-medium py-3.5 px-6 text-center">詳細</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {purchases.length > 0 ? (
                                purchases.map((purchase) => (
                                    <tr key={purchase.id} className={`hover:bg-slate-50/80 transition-colors ${selectedIds.has(purchase.id) ? 'bg-indigo-50/50' : ''}`}>
                                        <td className="py-4 px-4">
                                            <input
                                                type="checkbox"
                                                checked={selectedIds.has(purchase.id)}
                                                onChange={() => toggleId(purchase.id)}
                                                className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                            />
                                        </td>
                                        <td className="py-4 px-6 font-semibold text-slate-900">
                                            {purchase.purchase_number || '----------'}
                                        </td>
                                        <td className="py-4 px-6 font-semibold text-slate-800">
                                            {purchase.supplier_name || <span className="text-slate-400 font-normal">名称未設定</span>}
                                        </td>
                                        <td className="py-4 px-6">
                                            <PurchaseStatusSelector
                                                purchaseId={purchase.id}
                                                initialStatus={purchase.status || '下書き'}
                                            />
                                        </td>
                                        <td className="py-4 px-6 text-right font-bold text-slate-900 text-base">
                                            ¥{(purchase.total_amount || 0).toLocaleString()}
                                        </td>
                                        <td className="py-4 px-6 text-xs text-slate-600 font-medium">
                                            {purchase.desired_delivery_date || '設定なし'}
                                        </td>
                                        <td className="py-4 px-6 text-center">
                                            <Link href={`/purchases/${purchase.id}`} className="inline-flex items-center justify-center p-2 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-all hover:scale-105 active:scale-95">
                                                <ArrowRight size={18} />
                                            </Link>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={7} className="py-16 text-center text-slate-500">
                                        <p className="font-bold text-slate-700 text-base">
                                            {statusFilter ? `「${statusFilter}」の発注データはありません` : '発注データがありません'}
                                        </p>
                                        <p className="text-sm mt-1 text-slate-500">
                                            {statusFilter ? '別のステータスで絞り込んでみてください' : '在庫の欠品や外注依頼が発生した場合に、ここから発注書を作成します'}
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
