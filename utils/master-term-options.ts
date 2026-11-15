export const CUSTOMER_CLOSING_DAYS = ['月末締め', '20日締め', '15日締め', '随時'];
export const CUSTOMER_PAYMENT_TERMS = ['翌月末払い', '翌々月末払い', '翌月20日払い'];
export const SUPPLIER_PAYMENT_TERMS = ['月末締め翌月末払い', '月末締め翌々月末払い', '20日締め翌月20日払い', '前払い', '代金引換'];

// Legacy and custom terms must remain selectable without changing their meaning.
export function masterTermOptions(current: string | null | undefined, defaults: readonly string[]) {
    return current && !defaults.includes(current) ? [current, ...defaults] : [...defaults];
}
