'use client';
import {createContext,useContext,useState} from 'react';
import type {ReactNode} from 'react';
export const PurchaseSupplierContext=createContext({supplierId:'',setSupplierId:(_id:string)=>{}});
export function PurchaseSupplierProvider({children}:{children:ReactNode}) {
    const [supplierId,setSupplierId]=useState('');
    return <PurchaseSupplierContext.Provider value={{supplierId,setSupplierId}}>{children}</PurchaseSupplierContext.Provider>;
}
export function PurchaseSupplierSelect({suppliers}:{suppliers:{id:string;company_name:string}[]}) {
    const {supplierId,setSupplierId}=useContext(PurchaseSupplierContext);
    return <select name="supplier_id" aria-label="仕入先" value={supplierId} onChange={event=>setSupplierId(event.target.value)} className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-lg py-2.5 px-3 font-bold">
        <option value="">選択してください</option>
        {suppliers.map(supplier=><option key={supplier.id} value={supplier.id}>{supplier.company_name}</option>)}
    </select>;
}
