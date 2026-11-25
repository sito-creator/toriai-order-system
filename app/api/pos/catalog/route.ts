import { readCatalog } from '@/utils/pos-catalog-server';
export async function GET(request: Request) {
    try {
        return Response.json(await readCatalog(new URL(request.url).searchParams), { headers: { 'Cache-Control': 'private, no-store' } });
    } catch (e) {
        const error = (e as Error).message;
        return Response.json({ error }, { status: error.includes('ログイン') ? 401 : error.includes('権限') ? 403 : 503 });
    }
}
