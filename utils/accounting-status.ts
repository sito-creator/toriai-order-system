// Draft and cancelled documents are not receivables or posted journal entries.
export function isPostedInvoice(invoice: {status?: string | null}) {
    return ['発行済', '送付済', '入金済', '期日超過'].includes(invoice.status || '');
}
