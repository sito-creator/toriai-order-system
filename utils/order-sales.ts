// POS contributes through orders only, never by adding pos_sales a second time.
export function isRecognizedOrder(order: {source_type?: string | null; status?: string | null}) {
    if (['キャンセル', '取消済', 'cancelled', 'canceled', 'voided'].includes(order.status || '')) return false;
    return order.source_type !== 'POS' || order.status === '納品済';
}
