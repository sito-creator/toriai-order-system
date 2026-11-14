import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import ts from 'typescript';
const src=await fs.readFile(new URL('../app/actions/suppliers.ts',import.meta.url),'utf8');
const js=ts.transpileModule(src,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
async function run({auth=false,foreign=false,fail=false,invalid=false}={}) {
 const writes=[],filters=[],paths=[];const context=vm.createContext({console:{error(){}},Number,Object,String});
 const deps={
 '@/utils/auth':{getCurrentCompanyId:async()=>{if(auth)throw Error('auth');return 'own';}},
 'next/cache':{revalidatePath:p=>paths.push(p)},
 '@/utils/supabase/server':{createClient:async()=>({from(table){let inserted=false;const query={select(){return this;},eq(k,v){filters.push([table,k,v]);return this;},insert(data){inserted=true;writes.push(data);return this;},async maybeSingle(){return inserted?{data:fail?null:{id:'saved'},error:fail?{code:'42501'}:null}:{data:foreign?null:table==='products'?{id:'p',product_name:'研修',unit:'個'}:{id:'s'},error:null};}};return query;}})},
 };
 const mod=new vm.SourceTextModule(js,{context});await mod.link(name=>{const d=deps[name];return new vm.SyntheticModule(Object.keys(d),function(){for(const[k,v]of Object.entries(d))this.setExport(k,v);},{context});});await mod.evaluate();
 const form=new FormData();for(const[k,v]of Object.entries({company_id:'attacker',supplier_id:'s',product_id:'p',supplier_product_name:'研修',purchase_price:invalid?'-1':'0',min_order_qty:'1',lead_time_days:'0'}))form.set(k,v);
 return {result:await mod.namespace.createSupplierProduct(form),writes,filters,paths};
}
const ok=await run();assert.equal(ok.result.id,'saved');assert.equal(ok.writes[0].company_id,'own');assert.equal(ok.writes[0].purchase_price,0);assert.equal(ok.writes[0].lead_time_days,0);assert.ok(ok.filters.some(f=>f[0]==='suppliers'&&f[1]==='company_id'&&f[2]==='own'));assert.ok(ok.filters.some(f=>f[0]==='products'&&f[1]==='company_id'&&f[2]==='own'));
for(const options of [{auth:true},{foreign:true},{invalid:true},{fail:true}]){const r=await run(options);assert.ok(r.result.error);assert.equal(r.paths.length,0);if(!options.fail)assert.equal(r.writes.length,0);}
console.log('PASS: supplier product saves own company, validates supplier/product ownership, zero price/lead time, negative/auth/RLS failures');
