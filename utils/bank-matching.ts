export type BankRow={date:string;amount:number;desc:string;invoiceId:string};
type Invoice={id:string;total_amount:number};
export function matchBankRows(rows:Omit<BankRow,'invoiceId'>[],invoices:Invoice[]):BankRow[] {
    return rows.map(row=>{
        const candidates=invoices.filter(inv=>Number(inv.total_amount)===row.amount);
        const repeated=rows.filter(other=>other.amount===row.amount).length>1;
        return {...row,invoiceId:!repeated&&candidates.length===1?candidates[0].id:''};
    });
}
export function bankSelectionError(rows:Pick<BankRow,'amount'|'invoiceId'>[],invoices?:Invoice[]) {
    const seen=new Set<string>();
    for(const row of rows){
        if(!row.invoiceId)continue;
        if(!Number.isSafeInteger(row.amount)||row.amount<=0)return '入金額は正の整数で指定してください。';
        if(seen.has(row.invoiceId))return '同じ請求書を複数の入金に指定できません。選択を確認してください。';
        seen.add(row.invoiceId);
        if(invoices&&!invoices.some(inv=>inv.id===row.invoiceId&&Number(inv.total_amount)===row.amount))return '入金額と請求額が一致する請求書を選択してください。';
    }
    return '';
}
