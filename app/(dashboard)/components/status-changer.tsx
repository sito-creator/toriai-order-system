"use client";

import { useState, useTransition, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, Check, Loader2 } from 'lucide-react';

interface StatusChangerProps {
    id: string;
    currentStatus: string;
    statuses: { label: string; color: string; icon?: string }[];
    type: 'quote' | 'invoice';
}

export default function StatusChanger({ id, currentStatus, statuses, type }: StatusChangerProps) {
    const router = useRouter();
    const [isOpen, setIsOpen] = useState(false);
    const [status, setStatus] = useState(currentStatus);
    const [isPending, startTransition] = useTransition();
    const [showSuccess, setShowSuccess] = useState(false);
    const [openUpward, setOpenUpward] = useState(false);
    const buttonRef = useRef<HTMLButtonElement>(null);

    const currentStatusInfo = statuses.find(s => s.label === status) || statuses[0];

    useEffect(() => {
        if (isOpen && buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect();
            const spaceBelow = window.innerHeight - rect.bottom;
            setOpenUpward(spaceBelow < 250);
        }
    }, [isOpen]);

    const handleStatusChange = async (newStatus: string) => {
        if (newStatus === status) {
            setIsOpen(false);
            return;
        }

        setIsOpen(false);

        startTransition(async () => {
            try {
                const res = await fetch(`/api/${type}s/${id}/status`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status: newStatus }),
                });

                if (res.ok) {
                    setStatus(newStatus);
                    setShowSuccess(true);
                    setTimeout(() => setShowSuccess(false), 2000);
                    // 請求書管理と入金管理のデータを再取得して連動させる
                    router.refresh();
                }
            } catch (error) {
                console.error('Failed to update status:', error);
            }
        });
    };

    return (
        <div className="relative">
            <button
                ref={buttonRef}
                onClick={() => setIsOpen(!isOpen)}
                disabled={isPending}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm border transition-all hover:-translate-y-0.5 hover:shadow-md ${currentStatusInfo.color} ${isPending ? 'opacity-60' : ''}`}
            >
                {isPending ? (
                    <Loader2 size={14} className="animate-spin" />
                ) : showSuccess ? (
                    <Check size={14} />
                ) : null}
                <span>{status}</span>
                <ChevronDown size={14} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
                    <div className={`absolute right-0 z-50 bg-white border border-slate-200 rounded-xl shadow-lg shadow-slate-200/50 overflow-hidden min-w-[180px] ${openUpward ? 'bottom-full mb-2' : 'top-full mt-2'}`}>
                        <div className="p-1.5">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 py-1.5 mb-0.5">ステータス変更</p>
                            {statuses.map((s) => (
                                <button
                                    key={s.label}
                                    onClick={() => handleStatusChange(s.label)}
                                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-sm transition-colors hover:bg-slate-50 ${status === s.label ? 'bg-slate-50' : ''}`}
                                >
                                    <span className="w-2.5 h-2.5 rounded-full shrink-0"
                                        style={{ 
                                            backgroundColor: s.label === '下書き' ? '#64748b' 
                                                : s.label === '送付済' ? '#0ea5e9' 
                                                : s.label === '承認済' || s.label === '入金済' ? '#10b981' 
                                                : s.label === '失注' || s.label === '期日超過' ? '#f43f5e' 
                                                : s.label === '発行済' ? '#6366f1'
                                                : '#94a3b8' 
                                        }} 
                                    />
                                    <span className={`font-medium ${status === s.label ? 'text-slate-900' : 'text-slate-600'}`}>
                                        {s.label}
                                    </span>
                                    {status === s.label && (
                                        <Check size={14} className="ml-auto text-indigo-600" />
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
