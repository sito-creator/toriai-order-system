import assert from 'node:assert/strict';
import sharp from 'sharp';
import { loadModule } from './operation-fixture.mjs';
import { normalizeProductImage } from '../utils/product-image.ts';
import { uuidPattern } from '../utils/pos-catalog.ts';
const company='00000000-0000-4000-8000-000000000001',cat='00000000-0000-4000-8000-000000000002';
const oldPath=company+'/00000000-0000-4000-8000-000000000003.webp';
function fixture(role='owner',referenced=false,checkError=false) {
    const uploaded=[],removed=[];
    const db={auth:{getUser:async()=>({data:{user:{id:'user'}}})},from(table){return {select(){return this},eq(){return this},limit(){return this},maybeSingle:async()=>({data:referenced?{id:'saved'}:null,error:checkError?{code:'network'}:null}),single:async()=>({data:table==='profiles'?{company_id:company,role}:table==='product_categories'?{id:cat,name:'カット'}:{image_path:oldPath}})};},storage:{from(bucket){
        assert.equal(bucket,'product-images');return {upload:async(path,buffer,options)=>{uploaded.push({path,buffer,options});return {error:null};},remove:async(paths)=>{removed.push(...paths);return {error:null};}};
    }}};
    return {db,uploaded,removed};
}
const helper=await loadModule('utils/product-catalog-save.ts',{'@/utils/product-image':{normalizeProductImage},'@/utils/pos-catalog':{uuidPattern}},{crypto});
function form(){const f=new FormData();f.set('category_id',cat);f.set('pos_visible','on');f.set('pos_sort_order','4');return f;}
const buffer=await sharp({create:{width:1600,height:1200,channels:3,background:'#bbbbaa'}}).jpeg().toBuffer();
let f=form();f.set('product_image',new File([buffer],'photo.jpg',{type:'image/jpeg'}));
let ctx=fixture(),result=await helper.prepareProductCatalog(f,company,ctx.db,'product');
assert.equal(result.fields.category,'カット');assert.equal(result.fields.category_id,cat);assert.equal(result.fields.pos_sort_order,4);
assert.ok(result.fields.image_path.startsWith(company+'/'));assert.equal(ctx.uploaded.length,1);
assert.equal(ctx.uploaded[0].options.upsert,false);assert.equal((await sharp(ctx.uploaded[0].buffer).metadata()).format,'webp');
await result.failure();assert.deepEqual(ctx.removed,[result.fields.image_path],'failed DB save cleans only newly uploaded object');
assert.ok(!ctx.removed.includes(oldPath),'failed DB save preserves old image');
ctx=fixture();result=await helper.prepareProductCatalog(f,company,ctx.db,'product');await result.success();assert.deepEqual(ctx.removed,[oldPath]);
ctx=fixture();f=form();f.set('remove_product_image','1');result=await helper.prepareProductCatalog(f,company,ctx.db,'product');
assert.equal(result.fields.image_path,null);assert.equal(ctx.removed.length,0);await result.success();assert.deepEqual(ctx.removed,[oldPath]);
ctx=fixture();result=await helper.prepareProductCatalog(form(),company,ctx.db,'product');assert.equal('image_path' in result.fields,false);await result.success();assert.equal(ctx.removed.length,0);
f=form();f.set('product_image',new File([buffer],'photo.jpg',{type:'image/jpeg'}));
ctx=fixture('owner',true);result=await helper.prepareProductCatalog(f,company,ctx.db,'product');await result.failure();assert.equal(ctx.removed.length,0,'lost DB response must not delete an image that was committed');
ctx=fixture('owner',false,true);result=await helper.prepareProductCatalog(f,company,ctx.db,'product');await result.failure();assert.equal(ctx.removed.length,0,'uncertain reference check must retain the image');
await assert.rejects(helper.prepareProductCatalog(form(),company,fixture('member').db,'product'),/管理者/);
await assert.rejects(helper.prepareProductCatalog(form(),cat,fixture().db,'product'),/管理者/);
console.log('PASS: real image processing and staged private upload; failed save cleans new image only; replace/remove cleans old only after success; no-file preserves image; member/foreign company rejected');
