'use server';
import {changeDocumentStatus} from '@/utils/document-status';
export async function updateOrderStatus(id:string,status:string) {
    const result=await changeDocumentStatus('order',id,status);
    if(result.error)throw new Error(result.error);
}
