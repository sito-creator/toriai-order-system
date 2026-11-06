'use client';

import { useRef, useState, type FormEvent, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { addProduct } from '@/app/actions/products';

export default function ProductForm({children}: {children: ReactNode}) {
    const [error, setError] = useState('');
    const [pending, setPending] = useState(false);
    const submitting = useRef(false);
    const router = useRouter();

    async function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (submitting.current) return;
        const form = new FormData(event.currentTarget);
        submitting.current = true;
        setError('');
        setPending(true);
        let saved = false;
        try {
            const result = await addProduct(form);
            if (result.error || !result.id) {
                setError(result.error || '商品を保存できませんでした。');
                return;
            }
            saved = true;
            router.push('/products');
            router.refresh();
        } catch {
            setError('通信に失敗しました。再登録する前に商品一覧をご確認ください。入力内容はこの画面に保持しています。');
        } finally {
            if (!saved) {
                submitting.current = false;
                setPending(false);
            }
        }
    }

    return <form onSubmit={submit} className="p-6 space-y-6" aria-busy={pending}>
        {error && <p role="alert" className="rounded-lg bg-rose-50 border border-rose-200 p-4 text-rose-700">{error}</p>}
        {pending && <p role="status" className="text-indigo-700 font-semibold">商品を登録しています…</p>}
        <fieldset disabled={pending} className="space-y-6 disabled:opacity-60">{children}</fieldset>
    </form>;
}
