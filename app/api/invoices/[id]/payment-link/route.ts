import { revalidatePath } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { calculateInvoiceTotal } from '@/utils/invoice-total';
import { createInvoiceCheckoutSession, expireCheckoutSession } from '@/utils/stripe';

const TABLE_NOT_READY = '決済URL用テーブルが未作成です。supabase_migration_invoice_payment_links.sqlを実行してください。';

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    try {
        const { id } = await params;
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: 'ログインが必要です。' }, { status: 401 });

        const { data: profile } = await supabase
            .from('profiles')
            .select('company_id')
            .eq('id', user.id)
            .single();
        if (!profile?.company_id) return NextResponse.json({ error: '会社情報を取得できません。' }, { status: 403 });

        const { data: invoice, error: invoiceError } = await supabase
            .from('invoices')
            .select('id, company_id, invoice_number, status, customers(company_name, email)')
            .eq('id', id)
            .eq('company_id', profile.company_id)
            .single();
        if (invoiceError || !invoice) return NextResponse.json({ error: '請求書が見つかりません。' }, { status: 404 });
        if (invoice.status === '入金済') {
            return NextResponse.json({ error: '入金済みの請求書には決済URLを発行できません。' }, { status: 409 });
        }

        const { data: integration, error: integrationError } = await supabase
            .from('company_payment_integrations')
            .select('provider_account_id, livemode, status')
            .eq('company_id', profile.company_id)
            .eq('provider', 'stripe')
            .eq('status', 'connected')
            .maybeSingle();
        if (integrationError) return NextResponse.json({ error: TABLE_NOT_READY }, { status: 503 });
        if (!integration?.provider_account_id) {
            return NextResponse.json({ error: '設定画面でStripeアカウントを連携してください。' }, { status: 409 });
        }

        const { data: existing, error: existingError } = await supabase
            .from('invoice_payment_links')
            .select('*')
            .eq('invoice_id', id)
            .eq('status', 'active')
            .gt('expires_at', new Date().toISOString())
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
        if (existingError) return NextResponse.json({ error: TABLE_NOT_READY }, { status: 503 });
        if (existing) return NextResponse.json({ paymentLink: existing });

        const { data: lines, error: linesError } = await supabase
            .from('invoice_lines')
            .select('amount, tax_rate, tax_amount')
            .eq('invoice_id', id);
        if (linesError) throw new Error(linesError.message);

        const { total } = calculateInvoiceTotal(lines || []);
        if (!Number.isInteger(total) || total <= 0) {
            return NextResponse.json({ error: '請求金額が正しくありません。' }, { status: 400 });
        }

        const customer = Array.isArray(invoice.customers) ? invoice.customers[0] : invoice.customers;
        const origin = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
        const returnUrl = `${origin}/invoices/${id}`;
        const session = await createInvoiceCheckoutSession({
            invoiceId: id,
            invoiceNumber: invoice.invoice_number || id,
            customerName: customer?.company_name || '請求先',
            customerEmail: customer?.email,
            amount: total,
            successUrl: `${returnUrl}?payment=success`,
            cancelUrl: `${returnUrl}?payment=cancelled`,
            stripeAccountId: integration.provider_account_id,
        });

        const { data: paymentLink, error: insertError } = await supabase
            .from('invoice_payment_links')
            .insert({
                company_id: profile.company_id,
                invoice_id: id,
                provider: 'stripe',
                provider_payment_id: session.id,
                provider_account_id: integration.provider_account_id,
                payment_url: session.url,
                amount: total,
                currency: 'jpy',
                status: 'active',
                expires_at: new Date(session.expires_at * 1000).toISOString(),
                created_by: user.id,
            })
            .select('*')
            .single();
        if (insertError) throw new Error(insertError.message);

        revalidatePath(`/invoices/${id}`);
        return NextResponse.json({ paymentLink }, { status: 201 });
    } catch (error) {
        const message = error instanceof Error ? error.message : '決済URLの発行に失敗しました。';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

export async function DELETE(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    try {
        const { id } = await params;
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: 'ログインが必要です。' }, { status: 401 });

        const { data: paymentLink, error } = await supabase
            .from('invoice_payment_links')
            .select('id, provider_payment_id, provider_account_id')
            .eq('invoice_id', id)
            .eq('status', 'active')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
        if (error) return NextResponse.json({ error: TABLE_NOT_READY }, { status: 503 });
        if (!paymentLink) return NextResponse.json({ error: '有効な決済URLがありません。' }, { status: 404 });

        if (!paymentLink.provider_account_id) throw new Error('Stripe接続先が記録されていません。');
        await expireCheckoutSession(paymentLink.provider_payment_id, paymentLink.provider_account_id);
        const { error: updateError } = await supabase
            .from('invoice_payment_links')
            .update({ status: 'disabled', updated_at: new Date().toISOString() })
            .eq('id', paymentLink.id);
        if (updateError) throw new Error(updateError.message);

        revalidatePath(`/invoices/${id}`);
        return NextResponse.json({ success: true });
    } catch (error) {
        const message = error instanceof Error ? error.message : '決済URLの無効化に失敗しました。';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
