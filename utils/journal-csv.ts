import Encoding from 'encoding-japanese';
export type JournalEntry={id:string;date:string;debit_account:string;credit_account:string;amount:number;description:string;source_type:string;source_number:string};
export type CsvFormat={columns:{header:string;field:string;fixedValue:string}[];encoding:string;delimiter:string};
function fieldValue(entry:JournalEntry,field:string,fixed:string):string {
    if(field==='fixed')return fixed||'';
    if(field==='empty')return '';
    if(field==='tax_category')return '対象外';
    if(['amount','debit_amount','credit_amount'].includes(field))return String(entry.amount??0);
    if(['date','debit_account','credit_account','description','source_type','source_number'].includes(field))return String(entry[field as keyof JournalEntry]??'');
    return '';
}
export function buildJournalCsv(entries:JournalEntry[],format?:CsvFormat):{bytes:Uint8Array;mime:string} {
    const custom=!!format?.columns?.length;
    const rawDelimiter=format?.delimiter||',';
    const delimiter=rawDelimiter==='\\t'||rawDelimiter==='\t'?'\t':rawDelimiter;
    if(![',','\t'].includes(delimiter))throw new Error('CSVの区切り文字をご確認ください。');
    const headers=custom?format!.columns.map(c=>c.header):['日付','借方勘定','貸方勘定','金額','摘要','伝票種別','伝票番号'];
    const rows=entries.map(entry=>custom?format!.columns.map(c=>fieldValue(entry,c.field,c.fixedValue)):[entry.date,entry.debit_account,entry.credit_account,String(entry.amount??0),entry.description,entry.source_type,entry.source_number]);
    const escape=(value:unknown)=>`"${String(value??'').replaceAll('"','""')}"`;
    const text=[headers,...rows].map(row=>row.map(escape).join(delimiter)).join('\r\n');
    const encoding=(format?.encoding||'utf-8').toLowerCase().replaceAll('-','_');
    if(encoding==='shift_jis'||encoding==='sjis') {
        const bytes=Encoding.convert(Encoding.stringToCode(text),{to:'SJIS',from:'UNICODE'});
        const restored=Encoding.codeToString(Encoding.convert(bytes,{to:'UNICODE',from:'SJIS'}));
        if(restored!==text)throw new Error('Shift_JISで表現できない文字が含まれています。UTF-8を選択してください。');
        return {bytes:Uint8Array.from(bytes),mime:'text/csv;charset=shift_jis;'};
    }
    if(!['utf_8','utf8'].includes(encoding))throw new Error('CSVの文字コードをご確認ください。');
    return {bytes:new TextEncoder().encode('\uFEFF'+text),mime:'text/csv;charset=utf-8;'};
}
