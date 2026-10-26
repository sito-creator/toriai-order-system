export type PosLine = { product_id: string; name: string; price: number; quantity: number; tax_rate: number };

export function posPaymentState(session: { metadata?: { pos_sale_id?: string }; amount_total?: number; currency?: string; payment_status?: string; status?: string }, sale: {id:string;total:number}): 'paid' | 'voided' | null {
    if (session.metadata?.pos_sale_id !== sale.id || session.amount_total !== sale.total || session.currency !== 'jpy') throw new Error('決済内容が会計と一致しません。');
    if (session.payment_status === 'paid') return 'paid';
    return session.status === 'expired' ? 'voided' : null;
}

// 商品マスタの単価は税抜。税率ごとに合算して消費税を切り捨てる。
export function posTotals(lines: PosLine[]) {
    const groups = new Map<number, number>();
    for (const line of lines) {
        if (!Number.isSafeInteger(line.price) || line.price < 0 || !Number.isSafeInteger(line.quantity) || line.quantity < 1 || line.quantity > 999 || ![0, 8, 10].includes(line.tax_rate)) throw new Error('数量・単価・税率を確認してください。');
        groups.set(line.tax_rate, (groups.get(line.tax_rate) || 0) + line.price * line.quantity);
    }
    const taxes = [...groups].sort(([a], [b]) => b - a).map(([rate, subtotal]) => ({ rate, subtotal, tax: Math.floor(subtotal * rate / 100) }));
    const subtotal = taxes.reduce((sum, x) => sum + x.subtotal, 0);
    const tax = taxes.reduce((sum, x) => sum + x.tax, 0);
    if (!Number.isSafeInteger(subtotal + tax) || subtotal + tax > 99999999) throw new Error('会計金額が上限を超えています。');
    return { subtotal, tax, total: subtotal + tax, taxes };
}
