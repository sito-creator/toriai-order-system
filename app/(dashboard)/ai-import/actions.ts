'use server'

import { createClient } from '@/utils/supabase/server'

export async function parseOrderDocument(formData: FormData) {
    const fileBase64 = formData.get('fileBase64') as string | null;
    const fileMimeType = formData.get('fileMimeType') as string | null;
    const text = formData.get('text') as string | null;

    if (!process.env.GEMINI_API_KEY) {
        throw new Error('GEMINI_API_KEYが設定されていません。.env.localを確認してNext.jsを再起動してください。');
    }

    const parts: any[] = [];

    if (text) {
        parts.push({ text });
    }

    if (fileBase64 && fileMimeType) {
        parts.push({
            inlineData: {
                mimeType: fileMimeType,
                data: fileBase64
            }
        });
    }

    // 最先端のGemini 2.5 Flashに対して、ERP向けの厳格なJSON抽出を指示するシステムプロンプト
    parts.push({
        text: `
あなたは優秀なERPデータ入力アシスタントです。
提供されたテキスト内容、または画像・PDF（FAXや発注依頼の書類）を正確に解析し、以下の構造のJSONデータを厳格に出力してください。
Markdownブロック（\`\`\`json など）や説明文は一切含めず、純粋なJSON文字列の中身だけを返すようにしてください。

【抽出項目（必須）】
- customer_name: 顧客の会社名（正式名称が望ましい。不明な場合は null）
- order_date: 発注日 (YYYY-MM-DD形式、不明な場合は null)
- delivery_date: 納品希望日や対応完了希望日 (YYYY-MM-DD形式、不明な場合は null)
- total_amount: 合計請求額・見積金額 (数値のみ。もし全体合計の記載がない場合は、各アイテムの小計を足し算して計算する)
- items: 注文された商品明細の配列
  - name: 商品名・品目名・サービス名
  - quantity: 数量 (数値)
  - unit_price: 単価 (数値、記載がない場合は 0 を推測または設定)
  - amount: 小計金額 (数値)
- confidence: あなたの読取精度・正確さの自信度合をスコア化（0〜100の数値。手書きや画像が不鮮明で字が潰れている箇所があれば低くする）
`
    });

    const body = {
        contents: [{ parts }],
        generationConfig: {
            temperature: 0.1, // 一字一句正確に読み取るために創造性を極限まで抑える
            responseMimeType: "application/json",
        }
    };

    // 外部モジュール（npm install等）を必要としない、Next.js Server Actions独自の直接Fetch方式
    // ユーザーの「もっとサクサク動くようにしたい」という要望に合わせて、超高速なモデル(gemini-1.5-flash-8b)に変更して速度を改善
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-8b:generateContent?key=${process.env.GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });

    if (!response.ok) {
        const errorData = await response.text();
        console.error('Gemini API Error:', errorData);
        throw new Error('AIの解析中に通信エラーが発生しました。GeminiのAPIキー等が正しいか確認してください。');
    }

    const json = await response.json();
    if (!json.candidates || json.candidates.length === 0) {
        throw new Error('AIが回答を生成できませんでした。');
    }

    const resultText = json.candidates[0].content.parts[0].text;

    try {
        return JSON.parse(resultText);
    } catch (e) {
        console.error("JSON Parse Error on result: ", resultText);
        throw new Error("AIが不正な形式で回答しました。再度お試しください。");
    }
}

export async function registerParsedOrderToDB(parseResult: any) {
    const supabase = await createClient();

    // 取引先名の一部が一致する顧客を Supabase から検索してIDを紐付ける
    let customer_id = null;
    if (parseResult.customer_name) {
        // 例: 「株式会社デモ商事」から「株式会社」等のノイズを消して、「デモ商事」で部分一致検索する高度なマッチング
        const searchWord = parseResult.customer_name.replace(/(株式会社|有限会社|合同会社)/g, '').trim();
        const { data: customers } = await supabase
            .from('customers')
            .select('id, company_name')
            .ilike('company_name', `%${searchWord}%`)
            .limit(1);

        if (customers && customers.length > 0) {
            customer_id = customers[0].id;
        }
    }

    // ランダムなERP標準フォーマットの受注番号を発行
    const orderNumber = `ORD-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;

    // Supabaseにインサート
    const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert([{
            order_number: orderNumber,
            customer_id: customer_id, // 見つからなかった場合は null (未確定顧客) となる
            order_date: parseResult.order_date,
            delivery_date: parseResult.delivery_date,
            status: '確認待ち', // AI解析直後は必ず、人間の目で確認するため安全考慮で「確認待ち」バッジにする
            source_type: 'AI自動解析',
            ai_confidence: parseResult.confidence,
            total_amount: parseResult.total_amount
        }])
        .select()
        .single();

    if (orderError) {
        console.error("Order Insert Error", orderError);
        throw new Error('データベースへの登録に失敗しました: ' + orderError.message);
    }

    return { success: true, orderId: order.id, customerFound: !!customer_id };
}
