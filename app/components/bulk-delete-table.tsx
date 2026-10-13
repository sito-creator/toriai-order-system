'use client';

import { useState, useTransition, ReactNode } from 'react';
import { Trash2, Loader2, AlertTriangle } from 'lucide-react';

type BulkDeleteTableProps = {
    ids: string[];
    deleteAction: (ids: string[]) => Promise<void>;
    children: (props: {
        selectedIds: Set<string>;
        toggleId: (id: string) => void;
        isAllSelected: boolean;
        toggleAll: () => void;
    }) => ReactNode;
    entityName: string;
};

export default function BulkDeleteTable({ ids, deleteAction, children, entityName }: BulkDeleteTableProps) {
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isPending, startTransition] = useTransition();
    const [showConfirm, setShowConfirm] = useState(false);

    const toggleId = (id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    const isAllSelected = ids.length > 0 && ids.every(id => selectedIds.has(id));

    const toggleAll = () => {
        if (isAllSelected) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(ids));
        }
    };

    const handleDelete = () => {
        setShowConfirm(false);
        startTransition(async () => {
            try {
                await deleteAction(Array.from(selectedIds));
                setSelectedIds(new Set());
            } catch (err: any) {
                alert(err.message || '削除に失敗しました');
            }
        });
    };

    return (
        <div className="relative">
            {/* Selection toolbar */}
            {selectedIds.size > 0 && (
                <div className="sticky top-0 z-20 bg-gradient-to-r from-rose-50 to-rose-100/80 backdrop-blur border-b border-rose-200 px-6 py-3 flex items-center justify-between gap-4 animate-in slide-in-from-top-2">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-8 h-8 bg-rose-500 text-white rounded-full text-sm font-bold">
                            {selectedIds.size}
                        </div>
                        <span className="text-sm font-bold text-rose-800">
                            {selectedIds.size}件の{entityName}を選択中
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setSelectedIds(new Set())}
                            className="px-3 py-1.5 text-xs font-bold text-slate-600 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors"
                        >
                            選択解除
                        </button>
                        <button
                            onClick={() => setShowConfirm(true)}
                            disabled={isPending}
                            className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-all shadow-sm disabled:opacity-50"
                        >
                            {isPending ? (
                                <Loader2 size={14} className="animate-spin" />
                            ) : (
                                <Trash2 size={14} />
                            )}
                            {isPending ? '削除中...' : '選択を削除'}
                        </button>
                    </div>
                </div>
            )}

            {children({ selectedIds, toggleId, isAllSelected, toggleAll })}

            {/* Confirmation Modal */}
            {showConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
                        <div className="p-6 text-center">
                            <div className="flex items-center justify-center w-14 h-14 bg-rose-100 rounded-full mx-auto mb-4">
                                <AlertTriangle size={28} className="text-rose-600" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-900 mb-2">削除の確認</h3>
                            <p className="text-sm text-slate-600 mb-1">
                                選択した <span className="font-bold text-rose-600">{selectedIds.size}件</span> の{entityName}を削除します。
                            </p>
                            <p className="text-xs text-slate-500">
                                この操作は取り消せません。関連する明細データも同時に削除されます。
                            </p>
                        </div>
                        <div className="flex border-t border-slate-100">
                            <button
                                onClick={() => setShowConfirm(false)}
                                className="flex-1 py-3.5 text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors"
                            >
                                キャンセル
                            </button>
                            <button
                                onClick={handleDelete}
                                className="flex-1 py-3.5 text-sm font-bold text-white bg-rose-600 hover:bg-rose-700 transition-colors"
                            >
                                削除する
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
