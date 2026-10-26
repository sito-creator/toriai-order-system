// Run with node --experimental-strip-types tests/pos-payment.test.mjs
import assert from 'node:assert/strict';
import { posPaymentState } from '../utils/pos.ts';
import { createPosCheckout, retrievePosCheckout } from '../utils/stripe.ts';

const sale={id:'sale-test',total:1100};
const session={id:'cs_test',metadata:{pos_sale_id:sale.id},amount_total:1100,currency:'jpy',payment_status:'unpaid',status:'open'};
assert.equal(posPaymentState(session,sale),null);
assert.equal(posPaymentState({...session,payment_status:'paid',status:'complete'},sale),'paid');
assert.equal(posPaymentState({...session,status:'expired'},sale),'voided');
assert.throws(()=>posPaymentState({...session,amount_total:1},sale));
assert.throws(()=>posPaymentState({...session,currency:'usd'},sale));
assert.throws(()=>posPaymentState({...session,metadata:{pos_sale_id:'different'}},sale));
const originalFetch=globalThis.fetch;
process.env.STRIPE_SECRET_KEY='test-only-placeholder';
let calls=0;
globalThis.fetch=async(url,init)=>{
    const headers=new Headers(init?.headers);
    assert.equal(headers.get('Stripe-Account'),'acct_test');
    if(init?.method==='POST') {
        assert.equal(headers.get('Idempotency-Key'),'pos-sale-test');
        const body=new URLSearchParams(String(init.body));
        assert.equal(body.get('metadata[pos_sale_id]'),'sale-test');
        assert.equal(body.get('line_items[0][price_data][unit_amount]'),'1100');
        assert.equal(body.get('payment_method_types[0]'),'card');
        assert.equal(body.get('success_url'),'https://example.test/pos/payment-result');
    } else assert.ok(String(url).endsWith('/cs_test'));
    calls++;
    return Response.json({...session,url:'https://checkout.stripe.com/test',expires_at:1});
};
try {
    await createPosCheckout({id:sale.id,amount:sale.total,account:'acct_test',origin:'https://example.test'});
    await createPosCheckout({id:sale.id,amount:sale.total,account:'acct_test',origin:'https://example.test'});
    await retrievePosCheckout('cs_test','acct_test');
    assert.equal(calls,3);
} finally {globalThis.fetch=originalFetch;}
console.log('PASS: payment validation, unpaid/paid/expired, account headers, idempotency and Checkout request');
