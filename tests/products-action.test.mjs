// Run with: node --experimental-vm-modules tests/products-action.test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import ts from 'typescript';
import {productInput, productSaveError} from '../utils/product-input.ts';

const source=await fs.readFile(new URL('../app/actions/products.ts',import.meta.url),'utf8');
const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
async function scenario({code,authFailure=false,noRow=false,networkFailure=false,invalid=false}={}) {
    const writes=[], paths=[];
    const context=vm.createContext({console:{error(){}},Error});
    const modules={
        '@/utils/auth':{getCurrentCompanyId:async()=>{if(authFailure)throw Error('auth');return 'own-company';}},
        '@/utils/supabase/server':{createClient:async()=>({from(table){assert.equal(table,'products');return {insert(payload){writes.push(payload);return {select(columns){assert.equal(columns,'id');return {async single(){if(networkFailure)throw Error('network');return {data:code||noRow?null:{id:'saved-id'},error:code?{code}:null};}};}};}};}})},
        'next/cache':{revalidatePath:path=>paths.push(path)},
        '@/utils/product-input':{productInput,productSaveError},
    };
    const module=new vm.SourceTextModule(js,{context});
    await module.link(async name=>{const exports=modules[name];assert.ok(exports,name);return new vm.SyntheticModule(Object.keys(exports),function(){for(const[k,v]of Object.entries(exports))this.setExport(k,v);},{context});});
    await module.evaluate();
    const f=new FormData();
    for(const[k,v]of Object.entries({product_name:invalid?' ':'test',standard_price:'100',tax_rate:'0',is_active:'on',company_id:'foreign-company'}))f.set(k,v);
    const result=await module.namespace.addProduct(f);
    return {result,writes,paths};
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
