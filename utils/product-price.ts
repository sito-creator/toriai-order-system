// standard_price is authoritative, including an explicit zero. price is legacy.
export function productPrice(product:{standard_price?:number|string|null;price?:number|string|null}) {
    return Number(product.standard_price ?? product.price ?? 0);
}
