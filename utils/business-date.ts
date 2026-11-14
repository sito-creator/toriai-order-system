export function japanDate(now:Date=new Date()) {
    return new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Tokyo',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
}
export function isInvoiceOverdue(dueDate:string|null|undefined,now:Date=new Date()) {
    return !!dueDate && /^\d{4}-\d{2}-\d{2}$/.test(dueDate) && dueDate<japanDate(now);
}
