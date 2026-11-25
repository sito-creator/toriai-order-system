import { catalogContext } from '@/utils/pos-catalog-server';
import { uuidPattern } from '@/utils/pos-catalog';
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        if (!uuidPattern.test(id)) return new Response(null, { status: 404 });
        const { db, companyId } = await catalogContext();
        const { data: product } = await db.from('products').select('image_path').eq('company_id', companyId).eq('id', id).single();
        if (!product?.image_path?.startsWith(companyId + '/')) return new Response(null, { status: 404 });
        const { data, error } = await db.storage.from('product-images').download(product.image_path);
        if (error || !data) return new Response(null, { status: 404 });
        return new Response(data, { headers: { 'Content-Type': 'image/webp', 'Cache-Control': 'private, no-store',
            'Vary': 'Cookie', 'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': "default-src 'none'" } });
    } catch {
        return new Response(null, { status: 401 });
    }
}
