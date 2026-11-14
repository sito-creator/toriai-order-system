import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import ts from 'typescript';
const source=await fs.readFile(new URL('../app/actions/save-order.ts',import.meta.url),'utf8');
const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
async function run({auth=false,error=false,lines=[{quantity:3,unit_price:1200,tax_rate:0}]}={}) {
 const calls=[],paths=[];const context=vm.createContext({console:{error(){}},Number,JSON,Array});
 const deps={
  '@/utils/auth':{getCurrentCompanyId:async()=>{if(auth)throw Error('auth');return 'own';}},
  '@/utils/supabase/server':{createClient:async()=>({rpc:async(name,args)=>{calls.push({name,args});return {data:error?null:'saved',error:error?{code:'42501'}:null};}})},
  'next/cache':{revalidatePath:p=>paths.push(p)},
 };
 const module=new vm.SourceTextModule(js,{context});await module.link(async name=>{const d=deps[name];return new vm.SyntheticModule(Object.keys(d),function(){for(const[k,v]of Object.entries(d))this.setExport(k,v);},{context});});await module.evaluate();
 const form=new FormData();form.set('lines',JSON.stringify(lines));form.set('customer_id','test-customer');form.set('company_id','attacker');
 return {result:await module.namespace.saveOrder('test-id',form),calls,paths};
}
let r=await run();assert.equal(r.result.id,'saved');assert.equal(r.calls.length,1);assert.equal(r.calls[0].name,'save_order_with_lines');assert.equal(r.calls[0].args.p_lines[0].tax_rate,0);assert.ok(!('company_id' in r.calls[0].args.p_header));assert.deepEqual(r.paths,['/orders','/dashboard','/orders/saved']);
for(const opts of [{error:true},{auth:true},{lines:[]},{lines:[{quantity:0,unit_price:1,tax_rate:10}]},{lines:[{quantity:1,unit_price:-1,tax_rate:10}]}]){r=await run(opts);assert.ok(r.result.error);assert.equal(r.result.id,undefined);assert.equal(r.paths.length,0);if(!opts.error)assert.equal(r.calls.length,0);}
console.log('PASS: one atomic RPC; authenticated context; errors never invalidate/claim success; input validation; zero tax');
