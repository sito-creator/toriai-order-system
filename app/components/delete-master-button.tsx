'use client';

import { useRef } from 'react';
import { useFormStatus } from 'react-dom';
import { Trash2 } from 'lucide-react';

type Props = {
    id: string;
    name: string;
    entityLabel: string;
    action: (form: FormData) => Promise<void>;
};

function DeleteControls({ onCancel }: { onCancel: () => void }) {
    const { pending } = useFormStatus();
    return (
        <div className="mt-6 flex justify-end gap-3">
            <button type="button" onClick={onCancel} disabled={pending} autoFocus className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold disabled:opacity-50">キャンセル</button>
            <button type="submit" disabled={pending} className="px-4 py-2 rounded-xl bg-red-600 text-white font-bold disabled:opacity-50">{pending ? '削除中…' : '削除する'}</button>
        </div>
    );
}

export default function DeleteMasterButton({ id, name, entityLabel, action }: Props) {
    const dialog = useRef<HTMLDialogElement>(null);
    const titleId = `delete-master-title-${id}`;
    const descriptionId = `delete-master-description-${id}`;
    return (
        <>
            <button type="button" onClick={() => dialog.current?.showModal()} className="flex items-center gap-2 px-4 py-2.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl font-bold text-sm transition-colors border border-red-200">
                <Trash2 size={16} /><span>削除</span>
            </button>
            <dialog ref={dialog} aria-labelledby={titleId} aria-describedby={descriptionId} onCancel={event => {
                if (dialog.current?.querySelector<HTMLButtonElement>('button[type="submit"]')?.disabled) event.preventDefault();
            }} className="m-auto w-[calc(100%_-_2rem)] max-w-md rounded-2xl border border-slate-200 p-6 shadow-xl backdrop:bg-slate-900/50">
                <h2 id={titleId} className="text-lg font-bold text-slate-900">{entityLabel}の削除確認</h2>
                <p id={descriptionId} className="mt-4 text-slate-700 break-words">「{name}」を削除します。この操作は取り消せません。</p>
                <form action={action}>
                    <input type="hidden" name="confirm_delete" value={id} />
                    <DeleteControls onCancel={() => dialog.current?.close()} />
                </form>
            </dialog>
        </>
    );
}
