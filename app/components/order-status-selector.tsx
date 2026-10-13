'use client';

import { useTransition, useState } from 'react';
import { updateOrderStatus } from '@/app/actions/orders';
import { CheckCircle2, AlertCircle, ChevronDown, Loader2 } from 'lucide-react';

const STATUS_OPTIONS = [
    '確認待ち',
    '新規受注',
    '受注確定',
    '出荷準備中',
    '納品済',
    'キャンセル'
] as const;

const getStatusConfig = (status: string) => {
    switch (status) {
        case '確認待ち': return 'bg-amber-100 text-amber-700 border-amber-200';
        case '新規受注': return 'bg-amber-100 text-amber-700 border-amber-200';
        case '受注確定': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
        case '出荷準備中': return 'bg-sky-100 text-sky-700 border-sky-200';
        case '納品済': return 'bg-slate-100 text-slate-700 border-slate-200';
        case 'キャンセル': return 'bg-slate-100 text-slate-500 border-slate-200';
        default: return 'bg-slate-100 text-slate-600 border-slate-200';
    }
};

export default function OrderStatusSelector({ 
    orderId, 
    initialStatus 
}: { 
    orderId: string, 
    initialStatus: string 
}) {
    const [isPending, startTransition] = useTransition();
    const [currentStatus, setCurrentStatus] = useState(initialStatus || '確認待ち');

    const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newStatus = e.target.value;
        setCurrentStatus(newStatus);
        
        startTransition(async () => {
            try {
                await updateOrderStatus(orderId, newStatus);
            } catch (err: any) {
                alert('ステータスの更新に失敗しました: ' + err.message);
                setCurrentStatus(initialStatus); // revert on error
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
                
                {/* Visual Icon based on status */}
                <div className="absolute left-2.5 pointer-events-none flex items-center">
                    {(currentStatus === '確認待ち' || currentStatus === '新規受注') && <AlertCircle size={14} />}
                    {currentStatus === '受注確定' && <CheckCircle2 size={14} />}
                </div>

                <select 
                    value={currentStatus}
                    onChange={handleChange}
                    disabled={isPending}
                    className={`appearance-none bg-transparent py-1.5 pl-8 pr-8 text-xs font-bold outline-none cursor-pointer disabled:cursor-not-allowed`}
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
