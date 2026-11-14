'use client';
import type {ReactNode} from 'react';
import {saveOrder} from '@/app/actions/save-order';
import SaveForm from '@/app/components/save-form';
export default function OrderSaveForm({id=null,children}:{id?:string|null;children:ReactNode}) {
    return <SaveForm action={form=>saveOrder(id,form)} successPath={id?`/orders/${id}`:'/orders'}>{children}</SaveForm>;
}
