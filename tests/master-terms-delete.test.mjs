import assert from 'node:assert/strict';
import { loadModule, nodes, text, hooks } from './operation-fixture.mjs';
import * as options from '../utils/master-term-options.ts';

const DeleteMarker = () => null;
for (const kind of ['customers', 'suppliers']) {
    for (const value of [null, '', '翌月末払い', '当月末払い', '15日締め翌月末払い', '独自条件（45日後）']) {
        const id = 'mock-' + kind;
        const record = { id, company_name: '仮の会社', closing_day: value === null ? null : value === '' ? '' : '20日', payment_terms: value };
        const calls = [];
        const db = { from(table) {
            assert.equal(table, kind);
            const query = {
                select() { return query; }, eq() { return query; },
                async single() { return { data: record, error: null }; },
                update(payload) { calls.push({ operation: 'update', payload }); return query; },
                delete() { calls.push({ operation: 'delete' }); return query; },
                then(resolve, reject) { return Promise.resolve({ error: null }).then(resolve, reject); },
            };
            return query;
        } };
        const page = await loadModule(`app/(dashboard)/${kind}/[id]/edit/page.tsx`, {
            '@/utils/supabase/server': { createClient: async () => db },
            '@/utils/master-term-options': options,
            '@/app/components/delete-master-button': { default: DeleteMarker },
            'next/cache': { revalidatePath() {} },
            'next/navigation': { notFound() { throw Error('notfound'); }, redirect(path) { throw Error('redirect:' + path); } },
        });
        const tree = await page.default({ params: Promise.resolve({ id }), searchParams: Promise.resolve({}) });
        const selects = nodes(tree, node => node.type === 'select');
        const form = new FormData();
        form.set('company_name', '担当者のみ変更する仮顧客');
        for (const select of selects) {
            const values = nodes(select, node => node.type === 'option').map(node => node.props.value);
            assert.ok(values.includes(select.props.defaultValue), kind + ': default must be an available option');
            assert.equal(select.props.defaultValue, record[select.props.name] ?? '');
            assert.equal(new Set(values).size, values.length);
            form.set(select.props.name, select.props.defaultValue);
        }
        const updateForm = nodes(tree, node => node.type === 'form' && nodes(node, child => child.type === 'input' && child.props.name === 'company_name').length)[0];
        await assert.rejects(updateForm.props.action(form), /redirect:.*success=1/);
        assert.equal(calls[0].payload.payment_terms, value || null);
        if (kind === 'customers') assert.equal(calls[0].payload.closing_day, record.closing_day || null);

        calls.length = 0;
        const deletion = nodes(tree, node => node.type === DeleteMarker)[0];
        assert.equal(deletion.props.name, record.company_name);
        assert.equal(deletion.props.id, id);
        for (const confirmation of ['', 'another-record']) {
            const unconfirmed = new FormData();
            if (confirmation) unconfirmed.set('confirm_delete', confirmation);
            await assert.rejects(deletion.props.action(unconfirmed), /redirect:.*error=/);
            assert.equal(calls.length, 0);
        }
        const confirmed = new FormData();
        confirmed.set('confirm_delete', id);
        await assert.rejects(deletion.props.action(confirmed), new RegExp('redirect:/' + kind + '$'));
        assert.equal(calls.length, 1);
        assert.equal(calls[0].operation, 'delete');
    }
}

// Opening and cancelling the native dialog must never invoke the server action.
for (const pending of [false, true]) {
    const h = hooks();
    let modalCalls = 0, closes = 0, deletes = 0;
    const module = await loadModule('app/components/delete-master-button.tsx', {
        react: h.react,
        'react-dom': { useFormStatus: () => ({ pending }) },
    });
    h.reset();
    const action = async () => { deletes++; };
    const tree = module.default({ id: 'one', name: '削除対象名', entityLabel: '顧客', action });
    const dialog = nodes(tree, node => node.type === 'dialog')[0];
    dialog.props.ref.current = { showModal() { modalCalls++; }, close() { closes++; }, querySelector() { return { disabled: pending }; } };
    const trigger = nodes(tree, node => node.type === 'button' && text(node) === '削除')[0];
    assert.equal(trigger.props.type, 'button');
    trigger.props.onClick();
    assert.equal(modalCalls, 1);
    assert.equal(deletes, 0);
    let blockedEscape = false;
    dialog.props.onCancel({ preventDefault() { blockedEscape = true; } });
    assert.equal(blockedEscape, pending);
    assert.ok(text(dialog).includes('削除対象名'));
    assert.ok(text(dialog).includes('取り消せません'));
    assert.equal(nodes(dialog, node => node.type === 'form')[0].props.action, action);
    const token = nodes(dialog, node => node.type === 'input')[0];
    assert.equal(token.props.name, 'confirm_delete');
    assert.equal(token.props.value, 'one');
    const child = nodes(dialog, node => typeof node.type === 'function')[0];
    const controls = child.type(child.props);
    const cancel = nodes(controls, node => node.type === 'button' && text(node) === 'キャンセル')[0];
    const submit = nodes(controls, node => node.type === 'button' && node.props.type === 'submit')[0];
    assert.equal(cancel.props.disabled, pending);
    assert.equal(submit.props.disabled, pending);
    if (!pending) cancel.props.onClick();
    assert.equal(closes, pending ? 0 : 1);
    assert.equal(deletes, 0);
}
console.log('PASS: customer/supplier legacy, custom and unset terms preserved on unrelated edits; unknown/unconfirmed deletion blocked; confirmed deletion only in mock DB; native dialog open/cancel has no writes; pending controls disabled');
