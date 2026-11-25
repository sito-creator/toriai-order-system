export default function DashboardLoading() {
    return <section role="status" aria-live="polite" aria-label="画面を読み込み中" className="space-y-6">
        <p className="flex items-center gap-2 text-sm font-medium text-slate-600"><span aria-hidden="true" className="size-4 rounded-full border-2 border-indigo-200 border-t-indigo-600 motion-safe:animate-spin"/>画面を読み込んでいます…</p>
        <div aria-hidden="true" className="space-y-6 motion-safe:animate-pulse">
            <div className="h-8 w-48 rounded-lg bg-slate-200"/>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">{[0,1,2,3].map(i=><div key={i} className="h-24 rounded-2xl border border-slate-200 bg-white"/>)}</div>
            <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6">{[0,1,2,3,4].map(i=><div key={i} className="h-10 rounded-lg bg-slate-100"/>)}</div>
        </div>
    </section>;
}
