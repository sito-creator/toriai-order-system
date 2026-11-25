export type PosCategory = { id: string; name: string; color: string; sort_order: number; is_visible: boolean };
export type PosDisplaySettings = {
    card_mode: 'image' | 'text' | 'compact';
    card_size: 'small' | 'medium' | 'large';
    show_images: boolean;
    show_prices: boolean;
    product_sort: 'manual' | 'name' | 'price';
    favorites_first: boolean;
};
export type CatalogProduct = {
    id: string; name: string; code?: string; price: number; tax_rate: number;
    category: string; category_id: string | null; stock: number | null; track_inventory: boolean;
    image_url: string | null; pos_visible: boolean; pos_favorite: boolean; pos_sort_order: number;
};
export const defaultPosSettings: PosDisplaySettings = {
    card_mode: 'image', card_size: 'medium', show_images: true, show_prices: true,
    product_sort: 'manual', favorites_first: true,
};
export const uuidPattern = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
export const categoryColors = ['#4F46E5', '#0284C7', '#059669', '#DB2777', '#D97706', '#7C3AED'];
export function displaySettings(input: unknown): PosDisplaySettings {
    const x = input as Record<string, unknown> | null;
    if (!x || !['image', 'text', 'compact'].includes(String(x.card_mode)) ||
        !['small', 'medium', 'large'].includes(String(x.card_size)) ||
        !['manual', 'name', 'price'].includes(String(x.product_sort)) ||
        ['show_images', 'show_prices', 'favorites_first'].some(k => typeof x[k] !== 'boolean')) {
        throw new Error('表示設定の入力値を確認してください。');
    }
    return { card_mode: x.card_mode, card_size: x.card_size, product_sort: x.product_sort,
        show_images: x.show_images, show_prices: x.show_prices, favorites_first: x.favorites_first } as PosDisplaySettings;
}
export function categoryInput(input: unknown) {
    const x = input as Record<string, unknown>;
    if (!x || typeof x.name !== 'string' || !x.name.trim() || x.name.trim().length > 60 ||
        typeof x.color !== 'string' || !/^#[0-9a-f]{6}$/i.test(x.color) || typeof x.is_visible !== 'boolean') {
        throw new Error('カテゴリー名（60文字以内）と色を確認してください。');
    }
    return { name: x.name.trim(), color: x.color, is_visible: x.is_visible };
}
export function imageRoute(id: string, path: string | null | undefined) {
    return path ? `/api/products/${encodeURIComponent(id)}/image?v=${encodeURIComponent(path.split('/').pop()!)}` : null;
}
export function catalogPage(params: URLSearchParams) {
    const page = Number(params.get('page') || 0);
    if (!Number.isInteger(page) || page < 0 || page > 10000) throw new Error('ページ指定が不正です。');
    const raw = (params.get('q') || '').trim().slice(0, 100);
    // PostgREST filters must not accept filter syntax or wildcard injection from search text.
    const search = raw.replace(/[%,_().*\\]/g, ' ').replace(/\s+/g, ' ').trim();
    const category = params.get('category') || 'all';
    if (!['all', 'uncategorized'].includes(category) && !uuidPattern.test(category)) throw new Error('カテゴリーが不正です。');
    return { page, search, category, pageSize: 60 };
}
export function stockAllows(product: { track_inventory: boolean; stock: number | null }, quantity: number) {
    return quantity <= 999 && (!product.track_inventory || quantity <= (product.stock ?? 0));
}
export function categoryTextColor(color: string) {
    const rgb = [1,3,5].map(i=>parseInt(color.slice(i,i+2),16)/255).map(n=>n<=.04045?n/12.92:((n+.055)/1.055)**2.4);
    return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722 > .179 ? '#0F172A' : '#FFFFFF';
}
