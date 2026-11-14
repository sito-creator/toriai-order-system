type SourceLine={product_id?:string|null;product_name?:string|null;item_name?:string|null;quantity:number;unit_price:number;amount:number;tax_rate?:number|null;tax_amount?:number|null;delivery_date?:string|null;unit?:string|null;products?:{product_name?:string}|null};
type Product={id:string;product_name:string;unit?:string|null;is_active?:boolean|null};
export function inheritedLines(lines:SourceLine[],products:Product[],source:'order'|'quote',total:number,today:string) {
    let legacyInferred=false,needsTaxReview=false;
    const result=lines.map(line=>{
        const name=line.item_name||line.product_name||line.products?.product_name||'';
        const matches=products.filter(product=>product.product_name===name);
        const product=products.find(product=>product.id===line.product_id) || (matches.length===1?matches[0]:undefined);
        let rate=line.tax_rate==null?-1:Number(line.tax_rate);
        // Old quotes did not store tax. A single line can be recovered unambiguously
        // from the saved quote total; otherwise require an explicit user selection.
        if(rate<0 && source==='quote' && lines.length===1) {
            const rates=[0,8,10].filter(value=>Math.abs(Number(line.amount)+Math.floor(Number(line.amount)*value/100)-Number(total))<0.001);
            if(rates.length===1){rate=rates[0];legacyInferred=true;}
        }
        if(![0,8,10].includes(rate)){rate=-1;needsTaxReview=true;}
        const amount=Number(line.amount);
        const tax=rate<0?0:line.tax_amount==null?Math.floor(amount*rate/100):Number(line.tax_amount);
        return {product_id:line.product_id||product?.id||'',product_name:name||product?.product_name||'名称未設定',quantity:Number(line.quantity),unit_price:Number(line.unit_price),amount,tax_rate:rate,tax_amount:tax,delivery_date:line.delivery_date||today,unit:line.unit||product?.unit||''};
    });
    return {lines:result,legacyInferred,needsTaxReview};
}
