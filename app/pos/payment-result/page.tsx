export default async function PaymentResult({searchParams}:{searchParams:Promise<{cancelled?:string}>}) {
    const cancelled=(await searchParams).cancelled==='1';
    return <main className="m-auto max-w-lg p-8 text-center"><h1 className="mb-6 text-2xl font-bold">{cancelled?'お支払いは完了していません':'お支払い手続きを受け付けました'}</h1><p>{cancelled?'店舗スタッフへお知らせください。決済URLから再度お支払いいただけます。':'店舗スタッフが決済結果を確認します。この画面をスタッフへお見せください。'}</p><p className="mt-6 text-sm text-slate-500">この画面だけでは支払完了の証明にはなりません。</p></main>;
}
