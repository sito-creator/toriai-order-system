import {changeDocumentStatus} from '@/utils/document-status';
export async function PATCH(request:Request,{params}:{params:Promise<{id:string}>}) {
    let body;
    try{body=await request.json();}catch{return Response.json({error:'入力形式をご確認ください。'},{status:400});}
    const {id}=await params;
    const result=await changeDocumentStatus('invoice',id,body?.status);
    const {code,...payload}=result;
    return Response.json(payload,{status:code});
}
