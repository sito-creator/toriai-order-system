import assert from 'node:assert/strict';
import { productInput, productSaveError } from '../utils/product-input.ts';
function form(overrides={}) {
    const f=new FormData();
    for (const [key,value] of Object.entries({product_name:' ハイエンドノートPC ',product_code:' A-001 ',standard_price:'1000000',unit:'台',category:'ハードウェア',tax_rate:'10',is_active:'on',company_id:'attacker-company',...overrides})) f.set(key,value);
    return f;
}
const result=productInput(form(),'authenticated-company');
assert.equal(result.company_id,'authenticated-company');
assert.equal(result.standard_price,1000000);
assert.equal(result.product_name,'ハイエンドノートPC');
assert.equal(result.product_code,'A-001');
assert.equal(result.is_active,true);
for (const tax_rate of ['0','8','10']) assert.equal(productInput(form({tax_rate}),'company').tax_rate,Number(tax_rate));
const inactive=form(); inactive.delete('is_active');
assert.equal(productInput(inactive,'company').is_active,false);
for (const standard_price of ['','-1','NaN','Infinity','0.5']) assert.throws(()=>productInput(form({standard_price}),'company'));
assert.equal(productInput(form({standard_price:'0'}),'company').standard_price,0);
assert.throws(()=>productInput(form({tax_rate:'9'}),'company'));
assert.throws(()=>productInput(form({product_name:'  '}),'company'));
assert.throws(()=>productInput(form(),''));
assert.match(productSaveError('23505'),/商品コード/);
assert.match(productSaveError('42501'),/権限/);
assert.match(productSaveError(),/保存を確認/);
console.log('PASS: authenticated tenant, price/name validation, all tax rates, active flag, visible save errors');
