// Existing legacy statuses remain selectable; do not silently rewrite old records.
export const PURCHASE_STATUSES=['下書き','承認待ち','発注済','入荷待ち','一部入荷','入荷済','検収済','完了','キャンセル'] as const;
export function isRecognizedPurchase(purchase:{status?:string|null}) {
    return !['キャンセル','取消済','cancelled','canceled','voided'].includes(purchase.status||'');
}
