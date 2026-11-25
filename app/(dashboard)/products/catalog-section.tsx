import { catalogContext, catalogOptions } from '@/utils/pos-catalog-server';
import { imageRoute } from '@/utils/pos-catalog';
import ProductCatalogFields from './catalog-fields';
export default async function ProductCatalogSection({ product }: { product?: {
    id: string; category_id?: string; category?: string; image_path?: string | null;
    pos_visible?: boolean; pos_favorite?: boolean; pos_sort_order?: number;
} }) {
    const { db, companyId, canManage } = await catalogContext();
    const { categories, schemaReady } = await catalogOptions(db, companyId);
    return <ProductCatalogFields categories={categories} enabled={canManage} schemaReady={schemaReady}
        initial={product ? { ...product, image_url: imageRoute(product.id, product.image_path) } : undefined}/>;
}
