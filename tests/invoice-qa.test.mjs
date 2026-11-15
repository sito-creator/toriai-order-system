import assert from 'node:assert/strict';
import { loadModule, nodes, database } from './operation-fixture.mjs';
import * as dates from '../utils/business-date.ts';
import * as accounting from '../utils/accounting-status.ts';
import * as documents from '../utils/document-lines.ts';

const fixedNow = '2026-11-15T01:00:00Z';
class FixedDate extends Date {
    constructor(...args) { super(...(args.length ? args : [fixedNow])); }
}
const rows = [
    { id: 'late-issued', status: '発行済', due_date: '2026-05-31', total_amount: 132000 },
    { id: 'late-sent', status: '送付済', due_date: '2026-05-31', total_amount: 2750000 },
    { id: 'paid', status: '入金済', due_date: '2026-05-31' },
    { id: 'draft', status: '下書き', due_date: '2026-05-31' },
    { id: 'cancelled', status: 'キャンセル', due_date: '2026-05-31' },
    { id: 'today', status: '発行済', due_date: '2026-11-15' },
    { id: 'future', status: '送付済', due_date: '2026-11-16' },
    { id: 'no-date', status: '発行済', due_date: null },
];
const Table = () => null;
for (const [status, expected] of [
    ['期日超過', ['late-issued', 'late-sent']],
    ['発行済', ['today', 'no-date']],
    ['送付済', ['future']],
    ['入金済', ['paid']],
    ['下書き', ['draft']],
    ['', rows.map(row => row.id)],
]) {
    const d = database({ rows: { invoices: rows } });
    const page = await loadModule('app/(dashboard)/invoices/page.tsx', {
        ...d.deps,
        '@/utils/business-date': dates,
        '@/utils/accounting-status': accounting,
        '@/app/components/status-filter': { default: () => null },
        '@/app/components/invoices-table': { default: Table },
    }, { Date: FixedDate });
    const tree = await page.default({ searchParams: Promise.resolve({ status }) });
    const invoices = nodes(tree, n => n.type === Table)[0].props.invoices;
    assert.deepEqual(Array.from(invoices, invoice => invoice.id), expected);
    if (status === '期日超過') {
        assert.equal(invoices.reduce((sum, invoice) => sum + invoice.total_amount, 0), 2882000);
        assert.ok(invoices.every(invoice => invoice.status === '期日超過'));
    }
    assert.ok(d.filters.some(([, field, value]) => field === 'company_id' && value === 'own'));
    assert.equal(d.writes.length, 0);
}
assert.equal(rows[0].status, '発行済');

const sourceLine = { product_id: 'p', product_name: 'ノート', quantity: 3, unit_price: 100, amount: 300, tax_rate: 8, tax_amount: 24 };
for (const [source, lineDate, headerDate, expected] of [
    ['order', null, '2026-05-31', '2026-05-31'],
    ['order', '2026-05-30', '2026-05-31', '2026-05-30'],
    ['order', null, null, '2026-11-15'],
    ['quote', null, '2026-05-31', '2026-11-15'],
    ['quote', '2026-05-30', null, '2026-05-30'],
]) {
    const result = documents.inheritedLines([{ ...sourceLine, delivery_date: lineDate }], [], source, 324, '2026-11-15', headerDate);
    assert.equal(result.lines[0].delivery_date, expected);
    assert.equal(result.lines[0].tax_rate, 8);
    assert.equal(result.lines[0].tax_amount, 24);
}

// Exercise the server page so an omitted source-header argument is detected.
for (const source of ['order', 'quote']) {
    const Lines = () => null;
    const d = database({ rows: {
        [source === 'order' ? 'orders' : 'quotes']: [{ id: 'source', customer_id: 'customer', total_amount: 324, delivery_date: '2026-05-31' }],
        [source === 'order' ? 'order_lines' : 'quote_lines']: [sourceLine],
        products: [{ id: 'p', product_name: 'ノート', is_active: true }],
    } });
    const page = await loadModule('app/(dashboard)/invoices/new/page.tsx', {
        ...d.deps,
        '@/app/components/save-form': { default: () => null },
        '@/app/actions/save-documents': { createInvoice: async () => { throw Error('must not save'); } },
        '@/utils/document-lines': documents,
        '@/utils/business-date': { japanDate: () => '2026-11-15' },
        '../../orders/new/order-lines-form': { default: Lines },
    });
    const tree = await page.default({ searchParams: Promise.resolve({ [source + 'Id']: 'source' }) });
    const line = nodes(tree, n => n.type === Lines)[0].props.initialLines[0];
    assert.equal(line.delivery_date, source === 'order' ? '2026-05-31' : '2026-11-15');
    assert.equal(line.tax_rate, 8);
    assert.equal(d.writes.length, 0);
}
assert.equal(dates.japanDate(new Date('2026-11-14T15:00:00Z')), '2026-11-15');
assert.equal(dates.isInvoiceOverdue('2026-11-15', new Date('2026-11-15T14:59:59Z')), false);
assert.equal(dates.isInvoiceOverdue('2026-11-15', new Date('2026-11-15T15:00:00Z')), true);
console.log('PASS: invoice page overdue/status filters, receivable exclusions, tenant scope, source delivery-date precedence, actual order/quote page inheritance, tax preservation and JST boundaries');
