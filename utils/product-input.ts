export function productInput(form: FormData, companyId: string) {
    if (!companyId) throw new Error('会社情報を確認できません。再ログインしてください。');
    const string = (key: string) => typeof form.get(key) === 'string' ? (form.get(key) as string).trim() : '';
    const name = string('product_name');
    if (!name) throw new Error('商品・品目名を入力してください。');
    const priceText = string('standard_price');
    const price = Number(priceText);
    if (!priceText || !Number.isSafeInteger(price) || price < 0) throw new Error('標準単価は0以上の整数で入力してください。');
    const rateText = string('tax_rate');
    const taxRate = Number(rateText);
    if (!rateText || ![0, 8, 10].includes(taxRate)) throw new Error('適用税率を選択してください。');
    return {
        company_id: companyId,
        product_code: string('product_code') || null,
        product_name: name,
        category: string('category') || null,
        unit: string('unit') || '個',
        standard_price: price,
        tax_rate: taxRate,
        is_active: form.get('is_active') === 'on',
    };
}

export function productSaveError(code?: string) {
    if (code === '23505') return '同じ商品コードが登録されています。商品一覧を確認してください。';
    if (code === '42501') return '商品を保存する権限がありません。会社管理者に確認してください。';
    return '商品の保存を確認できませんでした。入力内容と商品一覧を確認して、再試行してください。';
}
