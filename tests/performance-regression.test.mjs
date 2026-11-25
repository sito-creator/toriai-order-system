import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {loadModule,hooks,nodes,text} from './operation-fixture.mjs';
import * as catalog from '../utils/pos-catalog.ts';
import {isRecognizedOrder} from '../utils/order-sales.ts';
import {isRecognizedPurchase} from '../utils/purchase-status.ts';
import {posTotals} from '../utils/pos.ts';

// A barrier proves the five dashboard queries start concurrently, without flaky timing limits.
const started=[],filters=[]; let release;
const barrier=new Promise(r=>{release=r;});
const db={from(table){const q={select(){return q;},eq(key,value){filters.push([table,key,value]);return q;},order(){return q;},then(resolve,reject){started.push(table);if(started.length===5)release();return barrier.then(()=>({data:table==='orders'?[{id:'ok',status:'納品済',source_type:'POS',customers:[{company_name:'demo'}]},{id:'void',status:'取消済',source_type:'POS'}]:[],count:2})).then(resolve,reject);}};return q;}};
const Marker=()=>null;
const dashboard=await loadModule('app/(dashboard)/dashboard/page.tsx',{
    '@/utils/supabase/server':{createClient:async()=>db},'@/utils/auth':{getCurrentCompanyId:async()=>'own'},
    'next/navigation':{redirect(){throw Error('redirect');}},'./dashboard-client':{default:Marker},
    '@/utils/order-sales':{isRecognizedOrder},'@/utils/purchase-status':{isRecognizedPurchase},
});
const rendered=await dashboard.default();
assert.equal(started.length,5);assert.ok(filters.every(([,key,value])=>key==='company_id'&&value==='own'));
assert.equal(rendered.props.orders.length,1);assert.equal(rendered.props.orders[0].customers.company_name,'demo');

// Settings aggregation uses one authenticated company, no caller-supplied company id.
let authenticated=true;const scope=[];const details=[];let finish;
const detailBarrier=new Promise(r=>{finish=r;});
const settingsDb={auth:{getUser:async()=>({data:{user:authenticated?{id:'user'}:null}})},from(table){let columns='';const q={select(s){columns=s;return q;},eq(key,value){scope.push([table,key,value]);return q;},neq(){return q;},order(){return q;},single(){return q;},then(resolve,reject){
    if(columns.includes('companies (*)'))return Promise.resolve({data:{company_id:'own',role:'owner',companies:{id:'own'}}}).then(resolve,reject);
    details.push(table);if(details.length===6)finish();
    return detailBarrier.then(()=>({data:table==='companies'?{staff_invite_code:'demo'}:table==='company_settings'?{theme_color:'#4f46e5'}:[],error:null})).then(resolve,reject);
}};return q;}};
const settings=await loadModule('app/actions/settings.ts',{'@/utils/supabase/server':{createClient:async()=>settingsDb},'next/cache':{revalidatePath(){}}});
const result=await settings.getSettingsPageData();assert.equal(details.length,6);assert.equal(result.codes.staffInviteCode,'demo');
assert.ok(scope.every(([table,key,value])=>table==='profiles'&&key==='id'?value==='user':value==='own'));
authenticated=false;await assert.rejects(settings.getSettingsPageData(),/認証/);

// Ready server catalog cards are usable without a duplicate initial fetch.
const h=hooks();let requests=0;const PickerModule=await loadModule('app/(dashboard)/pos/catalog-picker.tsx',{
    react:h.react,'@/utils/pos-catalog':catalog,
},{fetch:async()=>{requests++;throw Error('unexpected initial request');},window:{addEventListener(){},removeEventListener(){}},AbortController,setTimeout,clearTimeout});
h.reset();const picker=PickerModule.default({initial:{products:[],categories:[],settings:catalog.defaultPosSettings,schemaReady:true,canManage:true,total:0,page:0,pageSize:60},disabled:false,onAdd(){},onProducts(){},quantity(){return 0;}});
await h.flush();assert.equal(requests,0);assert.ok(!text(picker).includes('読み込み中…'));
const config=JSON.parse(await fs.readFile(new URL('../vercel.json',import.meta.url),'utf8'));assert.deepEqual(config.regions,['hnd1']);
assert.ok(nodes(picker,n=>n.props?.role==='tablist').length);
const historyHooks=hooks();let historyReads=0;
const register=await loadModule('app/(dashboard)/pos/register.tsx',{
    react:historyHooks.react,'@/utils/pos':{posTotals},'@/utils/pos-catalog':catalog,'./catalog-picker':{default:Marker},
},{window:{location:{search:''},dispatchEvent(){}},Event:class Event{},fetch:async()=>{historyReads++;return {ok:true,json:async()=>({sales:[],products:[]})};}});
historyHooks.reset();const registerTree=register.default({initialCatalog:{products:[],categories:[],settings:catalog.defaultPosSettings,schemaReady:true,canManage:true,total:0,page:0,pageSize:60}});
await historyHooks.flush();assert.equal(historyReads,0);
nodes(registerTree,n=>n.type==='button'&&text(n)==='売上・日計')[0].props.onClick();
await new Promise(r=>setTimeout(r,0));assert.equal(historyReads,1);
console.log('PASS: five parallel tenant-scoped dashboard reads; single settings action with six parallel reads and auth denial; ready POS without initial fetch; Tokyo region');
