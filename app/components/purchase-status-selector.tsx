'use client';

import { useTransition, useState } from 'react';
import { updatePurchaseStatus } from '@/app/actions/purchases';
import { CheckCircle2, Clock, Send, ChevronDown, Loader2, FileText, Package, ClipboardCheck } from 'lucide-react';

const STATUS_OPTIONS = [
    '下書き',
    '承認待ち',
    '発注済',
    '入荷済',
    '検収済',
    'キャンセル'
] as const;

const getStatusConfig = (status: string) => {
    switch (status) {
        case '下書き': return 'bg-slate-100 text-slate-700 border-slate-200';
        case '承認待ち': return 'bg-amber-100 text-amber-700 border-amber-200';
        case '発注済': return 'bg-sky-100 text-sky-700 border-sky-200';
        case '入荷済': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
        case '検収済': return 'bg-indigo-100 text-indigo-700 border-indigo-200';
        case 'キャンセル': return 'bg-rose-50 text-rose-600 border-rose-200';
        default: return 'bg-slate-100 text-slate-600 border-slate-200';
    }
};

const getStatusIcon = (status: string) => {
    switch (status) {
        case '下書き': return <FileText size={13} />;
        case '承認待ち': return <Clock size={13} />;
        case '発注済': return <Send size={13} />;
        case '入荷済': return <Package size={13} />;
        case '検収済': return <ClipboardCheck size={13} />;
        default: return null;
    }
};

export default function PurchaseStatusSelector({
    purchaseId,
    initialStatus
}: {
    purchaseId: string;
    initialStatus: string;
}) {
    const [isPending, startTransition] = useTransition();
    const [currentStatus, setCurrentStatus] = useState(initialStatus || '下書き');

    const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newStatus = e.target.value;
        setCurrentStatus(newStatus);

        startTransition(async () => {
            try {
                await updatePurchaseStatus(purchaseId, newStatus);
            } catch (err: any) {
                alert('ステータスの更新に失敗しました: ' + err.message);
                setCurrentStatus(initialStatus);
            }
        });
    };

    return (
        <div className="relative inline-flex items-center">
            {isPending && (
                <div className="absolute -left-5">
                    <Loader2 size={14} className="text-indigo-500 animate-spin" />
                </div>
            )}
            <div className={`relative inline-flex items-center rounded-full border transition-all ${getStatusConfig(currentStatus)} ${isPending ? 'opacity-50' : 'hover:brightness-95'}`}>
                <div className="absolute left-2.5 pointer-events-none flex items-center">
                    {getStatusIcon(currentStatus)}
                </div>

                <select
                    value={currentStatus}
                    onChange={handleChange}
                    disabled={isPending}
                    className="appearance-none bg-transparent py-1.5 pl-8 pr-8 text-xs font-bold outline-none cursor-pointer disabled:cursor-not-allowed"
                >
                    {STATUS_OPTIONS.map(status => (
                        <option key={status} value={status} className="text-slate-900 bg-white">
                            {status}
                        </option>
                    ))}
                </select>

                <div className="absolute right-2.5 pointer-events-none flex items-center">
                    <ChevronDown size={14} className="opacity-70" />
                </div>
            </div>
        </div>
    );
}
