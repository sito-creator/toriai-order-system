import assert from 'node:assert/strict';
import sharp from 'sharp';
import { normalizeProductImage } from '../utils/product-image.ts';
for(const format of ['jpeg','png','webp']) {
    const buffer=await sharp({create:{width:1600,height:1000,channels:3,background:'#d6c6ab'}})[format]().toBuffer();
    const out=await normalizeProductImage(new File([buffer],'test.'+format,{type:'image/'+format}));
    const meta=await sharp(out).metadata();
    assert.equal(meta.format,'webp');assert.ok(meta.width<=800);assert.ok(meta.height<=800);assert.ok(out.length<buffer.length);
}
await assert.rejects(normalizeProductImage(new File(['<svg/>'],'bad.svg',{type:'image/svg+xml'})),/JPEG/);
await assert.rejects(normalizeProductImage(new File(['not an image'],'lie.png',{type:'image/png'})),/読み込めません/);
await assert.rejects(normalizeProductImage(new File([new Uint8Array(9*1024*1024)],'big.png',{type:'image/png'})),/8MB/);
console.log('PASS: JPEG/PNG/WebP -> bounded WebP compression, spoofed/invalid/oversized file rejection');
