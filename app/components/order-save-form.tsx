'use client';
import {useState, useTransition} from 'react';
import type {ReactNode} from 'react';
import {useRouter} from 'next/navigation';
import {saveOrder} from '@/app/actions/save-order';
export default function OrderSaveForm({id=null, children}: {id?:string|null; children:ReactNode}) {
    const [error,setError]=useState('');
    const [pending,startTransition]=useTransition();
    const router=useRouter();
    return <form action={form=>startTransition(async()=>{
        setError('');
        const result=await saveOrder(id,form);
        if(result.error){setError(result.error);return;}
        router.push(id ? `/orders/${result.id}` : '/orders'); router.refresh();
    })}>
        {error && <p role="alert" className="mb-4 p-4 rounded-xl bg-rose-50 text-rose-700">{error}</p>}
        {pending && <p role="status" className="mb-4 text-indigo-700">受注を保存しています…</p>}
        <fieldset disabled={pending}>{children}</fieldset>
    </form>;
}
