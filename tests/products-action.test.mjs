// Run with: node --experimental-vm-modules tests/products-action.test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import ts from 'typescript';
import {productInput, productSaveError} from '../utils/product-input.ts';

const source=await fs.readFile(new URL('../app/actions/products.ts',import.meta.url),'utf8');
const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const productId='93af095b-0f23-482d-8b23-0b13ef426379';
async function scenario({code,authFailure=false,noRow=false,networkFailure=false,invalid=false,id,price='200000'}={}) {
    const writes=[], paths=[], filters=[];
    const query={
        eq(key,value){filters.push([key,value]);return this;},
        select(columns){assert.equal(columns,'id');return this;},
        async maybeSingle(){
            if(networkFailure)throw Error('network');
            return {data:code||noRow?null:{id:id||'saved-id'},error:code?{code}:null};
        },
    };
    const context=vm.createContext({console:{error(){}},Error});
    const modules={
        '@/utils/auth':{getCurrentCompanyId:async()=>{if(authFailure)throw Error('auth');return 'own-company';}},
        '@/utils/supabase/server':{createClient:async()=>({from(table){
            assert.equal(table,'products');
            return {
                insert(payload){assert.equal(id,undefined);writes.push(payload);return query;},
                update(payload){assert.ok(id);writes.push(payload);return query;},
            };
        }})},
        'next/cache':{revalidatePath:path=>paths.push(path)},
        '@/utils/product-input':{productInput,productSaveError},
    };
    const module=new vm.SourceTextModule(js,{context});
    await module.link(async name=>{const exports=modules[name];assert.ok(exports,name);return new vm.SyntheticModule(Object.keys(exports),function(){for(const[k,v]of Object.entries(exports))this.setExport(k,v);},{context});});
    await module.evaluate();
    const f=new FormData();
    for(const[k,v]of Object.entries({product_name:invalid?' ':'test',standard_price:price,tax_rate:'0',is_active:'on',company_id:'foreign-company'}))f.set(k,v);
    const result=id===undefined?await module.namespace.addProduct(f):await module.namespace.updateProduct(id,f);
    return {result,writes,paths,filters};
}
const ok=await scenario();
assert.equal(ok.result.id,'saved-id');
assert.equal(ok.writes[0].company_id,'own-company');
assert.equal(ok.writes[0].tax_rate,0);
assert.deepEqual(ok.paths,['/products','/pos','/dashboard']);
for(const options of [{code:'42501'},{code:'23505'},{code:'23502'},{noRow:true},{networkFailure:true}]){
    const test=await scenario(options);assert.ok(test.result.error);assert.equal(test.result.id,undefined);assert.equal(test.paths.length,0);
}
for(const options of [{authFailure:true},{invalid:true}]){const test=await scenario(options);assert.ok(test.result.error);assert.equal(test.writes.length,0);}
console.log('PASS: action saves own-company and zero tax, confirms returned row, invalidates list/POS, handles RLS/constraint/network/auth failures without false success');
const edited=await scenario({id:productId});
assert.equal(edited.result.id,productId);
assert.deepEqual(edited.filters,[['id',productId],['company_id','own-company']]);
assert.equal(edited.writes[0].standard_price,200000);
assert.equal(edited.writes[0].price,200000);
assert.equal(edited.writes[0].tax_rate,0);
assert.equal('company_id' in edited.writes[0],false);
assert.equal('updated_at' in edited.writes[0],false);
assert.deepEqual(edited.paths,['/products','/pos','/dashboard',`/products/${productId}`]);
const free=await scenario({id:productId,price:'0'});
assert.equal(free.writes[0].price,0);
assert.equal(free.writes[0].standard_price,0);
for(const options of [{noRow:true},{code:'42501'},{code:'42703'},{authFailure:true},{invalid:true},{networkFailure:true}]){
    const failed=await scenario({id:productId,...options});
    assert.ok(failed.result.error);
    assert.equal(failed.result.id,undefined);
    assert.equal(failed.paths.length,0);
}
for(const id of ['','invalid',null]){
    const failed=await scenario({id});assert.ok(failed.result.error);assert.equal(failed.writes.length,0);
}
console.log('PASS: price edit, zero price/tax, company scoping, missing row, no nonexistent timestamp, cache refresh');
