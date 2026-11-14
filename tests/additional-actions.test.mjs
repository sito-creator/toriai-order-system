import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import ts from 'typescript';
async function scenario(file,method,{fail=false,auth=false,invalid=false,noRow=false}={}) {
 const calls=[],paths=[];const context=vm.createContext({console:{error(){}},Number,JSON,Array,String,Object,FormData});
 const deps={
  '@/utils/auth':{getCurrentCompanyId:async()=>{if(auth)throw Error('auth');return 'own-company';}},
  '@/utils/document-number':{documentNumber:p=>p+'-QA'},
  'next/cache':{revalidatePath:p=>paths.push(p)},
  '@/utils/supabase/server':{createClient:async()=>({
   from(table){assert.equal(table,'suppliers');return {insert(payload){calls.push({table,payload});return {select(){return {async maybeSingle(){return {data:fail||noRow?null:{id:'saved'},error:fail?{code:'42501'}:null};}};}};}};},
   rpc:async(name,args)=>{calls.push({name,args});return {data:fail||noRow?null:'saved',error:fail?{code:'42501'}:null};},
  })},
 };
 const src=await fs.readFile(new URL('../'+file,import.meta.url),'utf8');const js=ts.transpileModule(src,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
 const mod=new vm.SourceTextModule(js,{context});await mod.link(name=>{const d=deps[name];assert.ok(d,name);return new vm.SyntheticModule(Object.keys(d),function(){for(const[k,v]of Object.entries(d))this.setExport(k,v);},{context});});await mod.evaluate();
 const f=new FormData();for(const[k,v]of Object.entries({company_id:'foreign-company',company_name:invalid?' ':'研修用',customer_id:'customer',supplier_id:'supplier',purchase_number:'QA',issue_date:'2026-11-14',due_date:'2026-12-20',lines:JSON.stringify(invalid?[]:[{product_id:'p',product_name:'研修',quantity:1,unit_price:100,tax_rate:0}])}))f.set(k,v);
 return {result:await mod.namespace[method](f),calls,paths};
}
for(const [file,method] of [['app/actions/suppliers.ts','createSupplier'],...['createQuote','createInvoice','createPurchase'].map(m=>['app/actions/save-documents.ts',m])]) {
 let r=await scenario(file,method);assert.equal(r.result.id,'saved');assert.ok(r.paths.length);
 if(method==='createSupplier')assert.equal(r.calls[0].payload.company_id,'own-company');
 else {assert.ok(!('company_id' in r.calls[0].args.p_header));assert.equal(r.calls[0].args.p_lines[0].tax_rate,0);}
 for(const options of [{fail:true},{noRow:true},{auth:true},{invalid:true}]){r=await scenario(file,method,options);assert.ok(r.result.error);assert.equal(r.paths.length,0);if(options.auth||options.invalid)assert.equal(r.calls.length,0);}
}
console.log('PASS: supplier own-company save; atomic document RPC actions; error/no-row/auth/input failures never claim success or revalidate');
