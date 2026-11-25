import { readCatalog } from '@/utils/pos-catalog-server';
import CatalogSettings from './settings';
export default async function PosSettingsPage() {
    let initial;
    try {
        initial = await readCatalog(new URLSearchParams({ management: '1' }));
    } catch {
        return <p role="alert" className="rounded-xl border p-5">会社オーナー・管理者のみ設定できます。権限とデータベース設定を確認してください。</p>;
    }
    if (!initial.schemaReady) return <p role="alert" className="rounded-xl bg-amber-50 p-5 text-amber-900">POSカタログのマイグレーションを適用してから、この画面を再読み込みしてください。</p>;
    return <CatalogSettings initial={initial}/>;
}
