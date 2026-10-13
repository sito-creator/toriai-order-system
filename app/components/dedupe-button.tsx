'use client';
import { Trash2 } from 'lucide-react';
import { useState } from 'react';
import { dedupeCustomersAction } from '@/app/actions/customers';

export default function DedupeButton() {
    const [isLoading, setIsLoading] = useState(false);

    const handleDedupe = async () => {
        if (!confirm('重複している顧客データ（同じ会社名が複数ある場合、古いものを残して新しいものを削除）を削除します。よろしいですか？')) {
            return;
        }

        setIsLoading(true);
        try {
            const res = await dedupeCustomersAction();
            if (res.error) {
                alert(`エラーが発生しました: ${res.error}`);
            } else if (res.count === 0) {
                alert('重複データはありませんでした。');
            } else {
                alert(`${res.count}件の重複データを削除しました！`);
                window.location.reload();
            }
        } catch (e: any) {
            alert(`エラー: ${e.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <button 
            type="button"
            onClick={handleDedupe}
            disabled={isLoading}
            className="flex items-center gap-2 bg-rose-50 hover:bg-rose-100 text-rose-600 px-3 py-2.5 rounded-xl font-medium transition-colors shadow-sm disabled:opacity-50 text-sm border border-rose-200"
            title="重複データの削除"
        >
            <Trash2 size={16} />
            <span className="hidden sm:inline">{isLoading ? "処理中..." : "重複を削除"}</span>
        </button>
    );
}
