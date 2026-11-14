'use client';
import {createContext, useContext, useState} from 'react';
import type {HTMLAttributes, ReactNode} from 'react';
import {Search} from 'lucide-react';
const SearchQuery = createContext('');
const normalize = (value: string) => value.normalize('NFKC').toLocaleLowerCase().trim();

export function MasterSearchRow({searchText, ...props}: HTMLAttributes<HTMLTableRowElement> & {searchText: string}) {
    const query = useContext(SearchQuery);
    return <tr {...props} hidden={!!query && !normalize(searchText).includes(query)} />;
}

export default function MasterSearch({placeholder, searchValues, children}: {placeholder:string; searchValues:string[]; children:ReactNode}) {
    const [query,setQuery] = useState('');
    const normalized = normalize(query);
    const matches = searchValues.filter(value=>normalize(value).includes(normalized)).length;
    return <SearchQuery.Provider value={normalized}>
        <div className="p-4 border-b border-slate-100 flex items-center gap-3">
            <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18}/>
                <input type="search" aria-label={placeholder} placeholder={placeholder} value={query} onChange={e=>setQuery(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2.5 pl-10 pr-4 text-sm" />
            </div>
            <span role="status" className="text-sm text-slate-500">{normalized ? `${matches}件が一致` : ''}</span>
        </div>
        {children}
    </SearchQuery.Provider>;
}
