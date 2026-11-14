'use client';
import {useState,useTransition} from 'react';
import type {ReactNode} from 'react';
import {useRouter} from 'next/navigation';
export default function SaveForm({action,successPath,children,className}: {action:(form:FormData)=>Promise<{id?:string;error?:string}>;successPath:string;children:ReactNode;className?:string}) {
    const [error,setError]=useState('');
    const [pending,startTransition]=useTransition();
    const router=useRouter();
    return <form className={className} onSubmit={event=>{
        event.preventDefault();
        const form=new FormData(event.currentTarget);
        startTransition(async()=>{
        setError('');
        try {
            const result=await action(form);
            if(result.error || !result.id){setError(result.error || '保存できませんでした。入力内容をご確認ください。');return;}
            router.push(successPath);router.refresh();
        } catch {setError('保存できませんでした。入力内容は保持されています。再度お試しください。');}
    });}}>
        {error && <p role="alert" className="p-4 mb-4 rounded-xl bg-rose-50 text-rose-700">{error}</p>}
        {pending && <p role="status" className="mb-4 text-indigo-700">保存しています…</p>}
        <fieldset disabled={pending} className="contents">{children}</fieldset>
    </form>;
}
