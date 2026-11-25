import assert from 'node:assert/strict';
import { loadModule } from './operation-fixture.mjs';
import * as catalog from '../utils/pos-catalog.ts';
const company='00000000-0000-4000-8000-000000000001',id='00000000-0000-4000-8000-000000000002';
let signedIn=true,path=company+'/file.webp',downloads=0;
const image=await loadModule('app/api/products/[id]/image/route.ts',{
    '@/utils/pos-catalog-server':{catalogContext:async()=>{if(!signedIn)throw Error('auth');return {companyId:company,db:{
        from(){return {select(){return this},eq(){return this},single:async()=>({data:{image_path:path}})};},
        storage:{from(){return {download:async()=>{downloads++;return {data:new Blob(['test'],{type:'image/webp'}),error:null};}};}}
    }};}},
    '@/utils/pos-catalog':catalog,
});
let r=await image.GET(new Request('https://example.test/api/products/'+id+'/image'),{params:Promise.resolve({id})});
assert.equal(r.status,200);assert.equal(r.headers.get('Cache-Control'),'private, no-store');assert.equal(r.headers.get('Vary'),'Cookie');assert.equal(downloads,1);
path='other-tenant/file.webp';r=await image.GET(new Request('https://example.test/'),{params:Promise.resolve({id})});assert.equal(r.status,404);assert.equal(downloads,1);
signedIn=false;r=await image.GET(new Request('https://example.test/'),{params:Promise.resolve({id})});assert.equal(r.status,401);
let called=0;const api=await loadModule('app/api/pos/catalog/manage/route.ts',{
    '@/utils/pos-catalog-server':{catalogContext:async()=>{called++;throw Error('会社オーナー・管理者のみ操作できます。');}},
    '@/utils/pos-catalog':catalog,'next/cache':{revalidatePath(){}},
});
r=await api.POST(new Request('https://example.test/api/pos/catalog/manage',{method:'POST',headers:{Origin:'https://evil.test','Content-Type':'application/json'},body:JSON.stringify({operation:'settings',values:catalog.defaultPosSettings})}));
assert.equal(r.status,403);assert.equal(called,0);
r=await api.POST(new Request('https://example.test/api/pos/catalog/manage',{method:'POST',headers:{Origin:'https://example.test','Content-Type':'application/json'},body:JSON.stringify({operation:'settings',values:catalog.defaultPosSettings})}));
assert.equal(r.status,403);assert.equal(called,1);
console.log('PASS: authenticated private image response, foreign path rejects before storage, anonymous denial, cross-origin mutation denial and manager gate');
