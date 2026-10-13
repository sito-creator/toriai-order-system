'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';

type StatusOption = {
    label: string;
    color: string;
};

export default function StatusFilter({ statuses }: { statuses: StatusOption[] }) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const pathname = usePathname();
    const currentStatus = searchParams.get('status') || '';

    const handleFilter = (status: string) => {
        const params = new URLSearchParams(searchParams.toString());
        if (status === currentStatus) {
            params.delete('status');
        } else {
            params.set('status', status);
        }
        router.push(`${pathname}?${params.toString()}`);
    };

    return (
        <div className="flex items-center gap-2 flex-wrap">
            <button
                onClick={() => {
                    const params = new URLSearchParams(searchParams.toString());
                    params.delete('status');
                    router.push(`${pathname}?${params.toString()}`);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                    !currentStatus
                        ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
            >
                すべて
            </button>
            {statuses.map((s) => (
                <button
                    key={s.label}
                    onClick={() => handleFilter(s.label)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                        currentStatus === s.label
                            ? `${s.color} ring-2 ring-offset-1 ring-slate-300 shadow-sm`
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                >
                    {s.label}
                </button>
            ))}
        </div>
    );
}
