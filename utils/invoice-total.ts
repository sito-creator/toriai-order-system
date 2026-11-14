export type InvoiceLineForTotal = {
    amount?: number | string | null;
    tax_rate?: number | string | null;
    tax_amount?: number | string | null;
};
export function invoiceLineTax(line:InvoiceLineForTotal) {
    const amount=Number(line.amount);
    if(line.amount==null||!Number.isFinite(amount)||amount<0)throw new Error('請求明細の金額を確認してください。');
    if(line.tax_amount!=null && String(line.tax_amount).trim()!=='') {
        const saved=Number(line.tax_amount);
        if(!Number.isFinite(saved)||saved<0)throw new Error('請求明細の税額を確認してください。');
        return saved;
    }
    if(line.tax_rate==null||String(line.tax_rate).trim()===''||![0,8,10].includes(Number(line.tax_rate)))throw new Error('税率・税額が未確認の明細があります。請求内容を確認してください。');
    return Math.floor(amount*Number(line.tax_rate)/100);
}
export function calculateInvoiceTotal(lines: InvoiceLineForTotal[]) {
    const tax=lines.reduce((sum,line)=>sum+invoiceLineTax(line),0);
    const subtotal=lines.reduce((sum,line)=>sum+Number(line.amount),0);
    return {subtotal,tax,total:subtotal+tax};
}
