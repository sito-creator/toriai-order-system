'use server';
import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

function parseCsv(contents: string): any[][] {
    const lines = contents.split(/\r?\n/).filter(line => line.trim().length > 0);
    return lines.map(line => {
        const row = [];
        let cur = '';
        let inQuote = false;
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
                if (inQuote && line[i + 1] === '"') {
                    cur += '"';
                    i++;
                } else {
                    inQuote = !inQuote;
                }
            } else if (char === ',' && !inQuote) {
                row.push(cur);
                cur = '';
            } else {
                cur += char;
            }
        }
        row.push(cur);
        return row;
    });
}

function processHeaders(headers: string[]): string[] {
    return headers.map(h => h.replace(/^["'\s]+|["'\s]+$/g, '').trim().toLowerCase());
}

export async function importCustomersCsv(formData: FormData) {
    const file = formData.get('file') as File;
    if (!file || !file.name) throw new Error('CSVファイルが選択されていません');

    const text = await file.text();
    const rows = parseCsv(text);
    if (rows.length < 2) throw new Error('データが見つかりません');

    const headers = processHeaders(rows[0]);
    
    const getIndex = (keys: string[]) => headers.findIndex(h => keys.some(k => h.includes(k)));
    const idxCompany = getIndex(['company_name', '会社名', '企業名']);
    const idxDept = getIndex(['department', '部署名']);
    const idxContact = getIndex(['contact_name', '担当者']);
    const idxEmail = getIndex(['email', 'メール']);
    const idxPhone = getIndex(['phone', '電話']);
    const idxClosing = getIndex(['closing_day', '締日']);
    const idxPayment = getIndex(['payment_terms', '支払']);

    if (idxCompany === -1) throw new Error('「会社名」が見つかりません');

    const dataToInsert = rows.slice(1).map(row => ({
        company_name: row[idxCompany] || '名称未設定',
        department: idxDept !== -1 ? row[idxDept] : null,
        contact_name: idxContact !== -1 ? row[idxContact] : null,
        email: idxEmail !== -1 ? row[idxEmail] : null,
        phone: idxPhone !== -1 ? row[idxPhone] : null,
        closing_day: idxClosing !== -1 ? row[idxClosing] : null,
        payment_terms: idxPayment !== -1 ? row[idxPayment] : null,
    })).filter(r => r.company_name && r.company_name !== '名称未設定');

    if (dataToInsert.length === 0) return { success: true };

    const supabase = await createClient();
    const { error } = await supabase.from('customers').insert(dataToInsert);
    if (error) throw new Error(error.message);

    revalidatePath('/customers');
    return { success: true, count: dataToInsert.length };
}

export async function importSuppliersCsv(formData: FormData) {
    const file = formData.get('file') as File;
    if (!file || !file.name) throw new Error('CSVファイルが選択されていません');

    const text = await file.text();
    const rows = parseCsv(text);
    if (rows.length < 2) throw new Error('データが見つかりません');

    const headers = processHeaders(rows[0]);
    
    const getIndex = (keys: string[]) => headers.findIndex(h => keys.some(k => h.includes(k)));
    const idxCompany = getIndex(['company_name', '会社名', '企業名']);
    const idxDept = getIndex(['department', '部署名']);
    const idxContact = getIndex(['contact_name', '担当者']);
    const idxEmail = getIndex(['email', 'メール']);
    const idxPhone = getIndex(['phone', '電話']);
    const idxPayment = getIndex(['payment_terms', '支払']);

    if (idxCompany === -1) throw new Error('「会社名」が見つかりません');

    const dataToInsert = rows.slice(1).map(row => ({
        company_name: row[idxCompany] || '名称未設定',
        department: idxDept !== -1 ? row[idxDept] : null,
        contact_name: idxContact !== -1 ? row[idxContact] : null,
        email: idxEmail !== -1 ? row[idxEmail] : null,
        phone: idxPhone !== -1 ? row[idxPhone] : null,
        payment_terms: idxPayment !== -1 ? row[idxPayment] : null,
    })).filter(r => r.company_name && r.company_name !== '名称未設定');

    const supabase = await createClient();
    const { error } = await supabase.from('suppliers').insert(dataToInsert);
    if (error) throw new Error(error.message);

    revalidatePath('/suppliers');
    return { success: true, count: dataToInsert.length };
}

export async function importProductsCsv(formData: FormData) {
    const file = formData.get('file') as File;
    if (!file || !file.name) throw new Error('CSVファイルが選択されていません');

    const text = await file.text();
    const rows = parseCsv(text);
    if (rows.length < 2) throw new Error('データが見つかりません');

    const headers = processHeaders(rows[0]);
    
    const getIndex = (keys: string[]) => headers.findIndex(h => keys.some(k => h.includes(k)));
    const idxCode = getIndex(['product_code', '商品コード']);
    const idxName = getIndex(['product_name', '商品名']);
    const idxStdPrice = getIndex(['standard_price', '標準価格', '販売価格']);
    const idxCostPrice = getIndex(['cost_price', '仕入価格', '原価']);
    const idxUnit = getIndex(['unit', '単位']);
    const idxCategory = getIndex(['category', 'カテゴリ']);

    if (idxName === -1) throw new Error('「商品名」が見つかりません');

    const dataToInsert = rows.slice(1).map(row => ({
        product_code: idxCode !== -1 ? row[idxCode] : null,
        product_name: row[idxName] || '名称未設定',
        standard_price: idxStdPrice !== -1 ? (Number(row[idxStdPrice]) || 0) : 0,
        cost_price: idxCostPrice !== -1 ? (Number(row[idxCostPrice]) || 0) : 0,
        unit: idxUnit !== -1 ? row[idxUnit] : '個',
        category: idxCategory !== -1 ? row[idxCategory] : null,
        is_active: true,
    })).filter(r => r.product_name && r.product_name !== '名称未設定');

    const supabase = await createClient();
    const { error } = await supabase.from('products').insert(dataToInsert);
    if (error) throw new Error(error.message);

    revalidatePath('/products');
    return { success: true, count: dataToInsert.length };
}

export async function importSupplierProductsCsv(formData: FormData) {
    const file = formData.get('file') as File;
    if (!file || !file.name) throw new Error('CSVファイルが選択されていません');

    const text = await file.text();
    const rows = parseCsv(text);
    if (rows.length < 2) throw new Error('データが見つかりません');

    const headers = processHeaders(rows[0]);
    
    const getIndex = (keys: string[]) => headers.findIndex(h => keys.some(k => h.includes(k)));
    const idxSupplier = getIndex(['supplier', '仕入先', '発注先']);
    const idxProduct = getIndex(['product', '商品名', '商品']);
    const idxCode = getIndex(['supplier_product_code', '仕入先商品コード', '商品コード']);
    const idxPrice = getIndex(['purchase_price', '仕入単価', '仕入価格', '単価']);
    const idxMinQty = getIndex(['min_order_qty', '最小発注数', '最低発注数']);
    const idxUnit = getIndex(['unit', '単位']);
    const idxLeadTime = getIndex(['lead_time_days', 'リードタイム', '納期']);
    const idxName = getIndex(['supplier_product_name', '仕入先商品名']);

    if (idxSupplier === -1) throw new Error('「仕入先」列が見つかりません');

    const supabase = await createClient();

    // 仕入先名→IDのマッピングを構築
    const { data: suppliers } = await supabase.from('suppliers').select('id, company_name');
    const supplierMap = new Map<string, string>();
    (suppliers || []).forEach((s: any) => supplierMap.set(s.company_name, s.id));

    // 商品名→IDのマッピングを構築
    const { data: products } = await supabase.from('products').select('id, product_name');
    const productMap = new Map<string, string>();
    (products || []).forEach((p: any) => productMap.set(p.product_name, p.id));

    const dataToInsert = rows.slice(1).map(row => {
        const supplierName = row[idxSupplier]?.trim();
        const supplierId = supplierMap.get(supplierName);
        if (!supplierId) return null; // 存在しない仕入先はスキップ

        const productName = idxProduct !== -1 ? row[idxProduct]?.trim() : null;
        const productId = productName ? productMap.get(productName) : null;

        return {
            supplier_id: supplierId,
            product_id: productId || null,
            supplier_product_code: idxCode !== -1 ? row[idxCode]?.trim() : null,
            supplier_product_name: idxName !== -1 ? row[idxName]?.trim() : (productName || null),
            purchase_price: idxPrice !== -1 ? (Number(row[idxPrice]) || 0) : 0,
            min_order_qty: idxMinQty !== -1 ? (Number(row[idxMinQty]) || 1) : 1,
            lead_time_days: idxLeadTime !== -1 ? (Number(row[idxLeadTime]) || null) : null,
        };
    }).filter((r): r is NonNullable<typeof r> => r !== null);

    if (dataToInsert.length === 0) throw new Error('有効なデータがありません。仕入先名がマスタに登録されているか確認してください。');

    const { error } = await supabase.from('supplier_products').insert(dataToInsert);
    if (error) throw new Error(error.message);

    revalidatePath('/supplier-products');
    return { success: true, count: dataToInsert.length };
}
