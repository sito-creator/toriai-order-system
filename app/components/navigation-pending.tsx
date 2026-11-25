'use client';
import { useLinkStatus } from 'next/link';

export default function NavigationPending() {
    const { pending } = useLinkStatus();
    return <span aria-hidden="true" className={`ml-auto size-4 shrink-0 rounded-full border-2 border-current border-t-transparent motion-safe:animate-spin ${pending ? 'opacity-70' : 'opacity-0'}`}/>;
}
