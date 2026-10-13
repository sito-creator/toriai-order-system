import { createClient } from '@/utils/supabase/server';
import { getCurrentCompanyId } from '@/utils/auth';
import { redirect } from 'next/navigation';
import DashboardClient from './dashboard-client';

export default async function DashboardPage() {
    const supabase = await createClient();
    let companyId: string | null = null;
    try {
        companyId = await getCurrentCompanyId();
    } catch {
        // 認証エラー
    }
    if (!companyId) {
        redirect('/login');
    }

    // 全受注データ（created_at, total_amount, status, source_type を取得）
    const { data: allOrders } = await supabase
        .from('orders')
        .select('id, created_at, total_amount, status, order_number, source_type, customer_id, customers ( company_name )')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

    // 全発注データ
    const { data: allPurchases } = await supabase
        .from('purchases')
        .select('id, created_at, total_amount')
        .eq('company_id', companyId);

    // 全請求書データ
    const { data: allInvoices } = await supabase
        .from('invoices')
        .select('id, created_at, total_amount, status')
        .eq('company_id', companyId);

    // 顧客数
    const { count: customerCount } = await supabase
        .from('customers')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId);

    // 商品数
    const { count: productCount } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId);

    // Supabase の結合結果は型定義上配列になる場合があるため、画面用に単一の顧客へ正規化する。
    const orders = (allOrders || []).map((order) => ({
        ...order,
        customers: Array.isArray(order.customers) ? order.customers[0] || null : order.customers,
    }));

    return (
        <DashboardClient
            orders={orders}
            purchases={allPurchases || []}
            invoices={allInvoices || []}
            customerCount={customerCount || 0}
            productCount={productCount || 0}
        />
    );
}
