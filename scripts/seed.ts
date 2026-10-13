import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing URL or KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function seed() {
  console.log('Seeding dummy customers...');
  const { data: customers, error: customerErr } = await supabase.from('customers').insert([
    { company_name: '株式会社フューチャー', contact_name: '田中 浩二', email: 'tanaka@future-example.co.jp', phone: '03-1234-5678', address: '東京都新宿区1-1-1' },
    { company_name: 'グローバルテック合同会社', contact_name: '佐藤 美咲', email: 'sato@global-example.com', phone: '06-9876-5432', address: '大阪府大阪市北区2-2-2' },
  ]).select();

  if (customerErr) {
    console.error('Customer error:', customerErr.message);
  } else {
    console.log('Inserted customers:', customers?.length);
  }

  console.log('Seeding dummy products...');
  const { data: products, error: productErr } = await supabase.from('products').insert([
    { product_code: 'A-001', product_name: 'プレミアムサポートライセンス (1年間)', default_price: 120000, tax_rate: 0.1, category: 'ライセンス' },
    { product_code: 'B-002', product_name: '初期導入設定支援サービス', default_price: 250000, tax_rate: 0.1, category: 'プロフェッショナルサービス' },
    { product_code: 'C-003', product_name: 'カスタマイズ開発 (人月)', default_price: 800000, tax_rate: 0.1, category: '開発' },
  ]).select();

  if (productErr) {
    console.error('Product error:', productErr.message);
  } else {
    console.log('Inserted products:', products?.length);
  }

  let customer1Id = customers?.[0]?.id;
  let customer2Id = customers?.[1]?.id;

  if (customer1Id && customer2Id) {
    console.log('Seeding orders...');
    const order1Number = `ORD-2024-001`;
    const order2Number = `ORD-2024-002`;
    
    // Order 1
    const { data: order1, error: order1err } = await supabase.from('orders').insert([
      {
        order_number: order1Number,
        customer_id: customer1Id,
        order_date: '2024-11-01',
        delivery_date: '2024-12-01',
        total_amount: 370000,
        status: '受注確定',
        notes: '早期導入希望のため、特急対応としてアサイン済み'
      }
    ]).select().single();

    if (order1err) console.error('Order1 error:', order1err.message);
    else {
      // lines for order 1
      await supabase.from('order_lines').insert([
        { order_id: order1.id, product_id: products![0].id, quantity: 1, unit_price: 120000, amount: 120000 },
        { order_id: order1.id, product_id: products![1].id, quantity: 1, unit_price: 250000, amount: 250000 }
      ]);
      console.log('Inserted Order 1 & Lines');
    }

    // Order 2
    const { data: order2, error: order2err } = await supabase.from('orders').insert([
      {
        order_number: order2Number,
        customer_id: customer2Id,
        order_date: '2024-11-15',
        delivery_date: '2025-01-31',
        total_amount: 1600000,
        status: '確認待ち',
        notes: '開発スコープは要件定義書v1.2に基づく'
      }
    ]).select().single();

    if (order2err) console.error('Order2 error:', order2err.message);
    else {
      // lines for order 2
      await supabase.from('order_lines').insert([
        { order_id: order2.id, product_id: products![2].id, quantity: 2, unit_price: 800000, amount: 1600000 }
      ]);
      console.log('Inserted Order 2 & Lines');
    }
  }

  console.log('Done.');
}

seed();
