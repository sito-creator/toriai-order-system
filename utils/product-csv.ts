// CSV records may contain quoted commas, escaped quotes, and embedded newlines.
export function csvRecords(text:string):string[][] {
    const rows:string[][]=[]; let row:string[]=[],cell='',quoted=false,closed=false;
    const pushCell=()=>{row.push(cell);cell='';closed=false;};
    const pushRow=()=>{pushCell();if(row.some(v=>v.trim()))rows.push(row);row=[];};
    text=text.replace(/^\uFEFF/,'');
    for(let i=0;i<text.length;i++) {
        const c=text[i];
        if(quoted){if(c==='"'){if(text[i+1]==='"'){cell+='"';i++;}else{quoted=false;closed=true;}}else cell+=c;continue;}
        if(c==='"'){if(cell||closed)throw new Error('CSVの引用符の位置をご確認ください。');quoted=true;}
        else if(c===',')pushCell();
        else if(c==='\n'||c==='\r'){if(c==='\r'&&text[i+1]==='\n')i++;pushRow();}
        else if(closed){if(!/\s/.test(c))throw new Error('CSVの引用符の後に不正な文字があります。');}
        else cell+=c;
    }
    if(quoted)throw new Error('CSVの引用符が閉じられていません。');
    if(cell||row.length||closed)pushRow();
    return rows;
}
function yen(value:string,label:string,row:number) {
    const raw=value.trim();
    if(!/^(?:\d+|\d{1,3}(?:,\d{3})+)$/.test(raw))throw new Error(`${row}行目の${label}は0以上の整数で入力してください。`);
    const n=Number(raw.replaceAll(',',''));
    if(!Number.isSafeInteger(n))throw new Error(`${row}行目の${label}が上限を超えています。`);
    return n;
}
export function productCsvRows(text:string,companyId:string) {
    if(!companyId)throw new Error('所属会社を確認できません。');
    const rows=csvRecords(text);
    if(rows.length<2)throw new Error('登録する商品データがありません。');
    const headers=rows[0].map(h=>h.trim().toLowerCase());
    const col=(names:string[])=>{const ids=headers.flatMap((h,i)=>names.includes(h)?[i]:[]);if(ids.length>1)throw new Error(`${names[0]}の列が重複しています。`);return ids[0]??-1;};
    const name=col(['商品名','product_name']),price=col(['標準単価','標準価格','販売価格','standard_price']);
    const cost=col(['仕入単価','仕入価格','原価','cost_price']),code=col(['商品コード','product_code']);
    const unit=col(['単位','unit']),category=col(['カテゴリ','category']),active=col(['有効','is_active']),rate=col(['税率','税率区分','tax_rate']);
    if(name<0||price<0)throw new Error('「商品名」と「標準単価」の列が必要です。');
    const codes=new Set<string>();
    return rows.slice(1).map((row,i)=>{
        const line=i+2;
        if(row.length!==headers.length)throw new Error(`${line}行目の列数が見出しと一致しません。`);
        const get=(index:number)=>index<0?'':row[index].trim();
        if(!get(name))throw new Error(`${line}行目の商品名を入力してください。`);
        const p=yen(get(price),'標準単価',line),productCode=get(code);
        if(productCode&&codes.has(productCode))throw new Error(`${line}行目の商品コードがCSV内で重複しています。`);
        if(productCode)codes.add(productCode);
        const flag=get(active).toLowerCase();
        if(!['','true','false','1','0','有効','無効'].includes(flag))throw new Error(`${line}行目の有効はTRUEまたはFALSEで入力してください。`);
        const rateText=get(rate).replace(/%$/,'');
        const tax=rateText===''?10:rateText==='非課税'?0:Number(rateText);
        if(![0,8,10].includes(tax))throw new Error(`${line}行目の税率は0・8・10で入力してください。`);
        return {company_id:companyId,product_code:productCode||null,product_name:get(name),standard_price:p,price:p,cost_price:get(cost)?yen(get(cost),'仕入単価',line):0,unit:get(unit)||'個',category:get(category)||null,is_active:!['false','0','無効'].includes(flag),tax_rate:tax};
    });
}
export function decodeProductCsv(bytes:ArrayBuffer) {
    try{return new TextDecoder('utf-8',{fatal:true}).decode(bytes);}catch{return new TextDecoder('shift_jis',{fatal:true}).decode(bytes);}
}
