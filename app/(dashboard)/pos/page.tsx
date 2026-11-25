import { readCatalog } from '@/utils/pos-catalog-server';
import PosRegister from './register';

export default async function PosPage() {
    let initial;
    try {
        initial = await readCatalog(new URLSearchParams());
    } catch {
        return <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-5 text-rose-700">商品を取得できません。ログインと会社設定、データベース設定を確認して再読み込みしてください。</p>;
    }
    return <PosRegister initialCatalog={initial}/>;
}
