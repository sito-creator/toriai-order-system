'use server';
import {changeDocumentStatus} from '@/utils/document-status';
export async function updatePurchaseStatus(id:string,status:string) {
    const result=await changeDocumentStatus('purchase',id,status);
    if(result.error)throw new Error(result.error);
}
