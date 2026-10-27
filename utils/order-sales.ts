// POS contributes through orders only, never by adding pos_sales a second time.
export function isRecognizedOrder(order: {source_type?: string | null; status?: string | null}) {
    return order.source_type !== 'POS' || order.status === '納品済';
}
