import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  const supabase = await createClient();

  // 1. Customers
  const { data: customers, error: customerErr } = await supabase.from('customers').insert([
    { company_name: '株式会社フューチャー', contact_name: '田中 浩二', email: 'tanaka@future-example.co.jp', phone: '03-1234-5678', department: '営業部', closing_day: '月末', payment_terms: '翌月末払い' },
    { company_name: 'グローバルテック合同会社', contact_name: '佐藤 美咲', email: 'sato@global-example.com', phone: '06-9876-5432', department: '調達部', closing_day: '20日', payment_terms: '翌月末払い' },
  ]).select();

  if (customerErr) {
    return NextResponse.json({ error: 'Customer error', details: customerErr });
  }

  // 2. Products
  const { data: products, error: productErr } = await supabase.from('products').insert([
    { product_name: 'プレミアムサポートライセンス (1年間)', price: 120000, stock: 100 },
    { product_name: '初期導入設定支援サービス', price: 250000, stock: 999 },
    { product_name: 'カスタマイズ開発 (人月)', price: 800000, stock: 50 },
  ]).select();

  if (productErr) {
    return NextResponse.json({ error: 'Product error', details: productErr });
  }

  // 3. Orders & Lines
  const customer1Id = customers?.[0]?.id;
  const customer2Id = customers?.[1]?.id;

  if (customer1Id && customer2Id) {
    // Order 1
    const { data: order1, error: order1err } = await supabase.from('orders').insert({
      order_number: 'ORD-2024-001',
      customer_id: customer1Id,
      order_date: '2024-11-01',
      delivery_date: '2024-12-01',
      total_amount: 370000,
      status: '受注確定',
      source_type: 'Webフォーム'
    }).select().single();

    if (order1err) return NextResponse.json({ error: 'Order1 error', details: order1err });

    // Try to insert order lines if table exists, otherwise ignore error
    const { error: lines1err } = await supabase.from('order_lines').insert([
      { order_id: order1.id, product_id: products[0].id, quantity: 1, unit_price: 120000, amount: 120000 },
      { order_id: order1.id, product_id: products[1].id, quantity: 1, unit_price: 250000, amount: 250000 }
    ]);

    // Order 2
    const { data: order2, error: order2err } = await supabase.from('orders').insert({
      order_number: 'ORD-2024-002',
      customer_id: customer2Id,
      order_date: '2024-11-15',
      delivery_date: '2025-01-31',
      total_amount: 1600000,
      status: '確認待ち',
      source_type: 'メール'
    }).select().single();

    if (order2err) return NextResponse.json({ error: 'Order2 error', details: order2err });

    const { error: lines2err } = await supabase.from('order_lines').insert([
      { order_id: order2.id, product_id: products[2].id, quantity: 2, unit_price: 800000, amount: 1600000 }
    ]);
  }

  // 4. Suppliers
  const { data: suppliers, error: supplierErr } = await supabase.from('suppliers').insert([
    { company_name: '株式会社システムベンダー', contact_name: '鈴木 一郎', email: 'suzuki@vendor.example.jp', phone: '03-5555-1111', payment_terms: '翌月末払い', lead_time_days: 14 },
    { company_name: 'パーツクリエイト株式会社', contact_name: '高橋 洋子', email: 'takahashi@parts.example.com', phone: '045-999-8888', payment_terms: '翌々月末払い', lead_time_days: 30 }
  ]).select();

  if (!supplierErr && suppliers && products) {
    // 5. Supplier Products
    await supabase.from('supplier_products').insert([
      { supplier_id: suppliers[0].id, product_id: products[0].id, supplier_product_name: 'ライセンス仕入', supplier_product_code: 'V-LIC-01', purchase_price: 80000, min_order_qty: 1, unit: 'ライセンス', lead_time_days: 3 },
      { supplier_id: suppliers[1].id, product_id: products[1].id, supplier_product_name: '外注設定支援', supplier_product_code: 'P-SET-99', purchase_price: 150000, min_order_qty: 1, unit: '回', lead_time_days: 7 },
      { supplier_id: suppliers[0].id, supplier_product_name: '汎用サーバー機', supplier_product_code: 'SVR-1000', purchase_price: 450000, min_order_qty: 1, unit: '台', lead_time_days: 21 }
    ]);
  }

  return NextResponse.json({ success: true, message: 'Seeded successfully!' });
}
