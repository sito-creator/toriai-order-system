import { randomUUID } from 'node:crypto';
export function documentNumber(prefix: 'QUO' | 'INV', date = new Date(), uuid = randomUUID()) {
    const year = new Intl.DateTimeFormat('en-US', {timeZone:'Asia/Tokyo',year:'numeric'}).format(date);
    return `${prefix}-${year}-${uuid.replaceAll('-', '').toUpperCase()}`;
}
