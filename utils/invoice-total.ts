export type InvoiceLineForTotal = {
    amount?: number | string | null;
    tax_rate?: number | string | null;
    tax_amount?: number | string | null;
};

export function calculateInvoiceTotal(lines: InvoiceLineForTotal[]) {
    const subtotal = lines.reduce((sum, line) => sum + Number(line.amount || 0), 0);
    const tax = lines.reduce((sum, line) => {
        const savedTax = Number(line.tax_amount);
        if (Number.isFinite(savedTax)) return sum + savedTax;
        const rate = Number(line.tax_rate ?? 10);
        return sum + Math.floor(Number(line.amount || 0) * rate / 100);
    }, 0);

    return { subtotal, tax, total: subtotal + tax };
}
