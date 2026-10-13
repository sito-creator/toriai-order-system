import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET(request: NextRequest) {
    const url = new URL(request.url)
    const code = url.searchParams.get('code')
    const requestedNext = url.searchParams.get('next') || '/dashboard'
    const next = requestedNext.startsWith('/') && !requestedNext.startsWith('//')
        ? requestedNext
        : '/dashboard'

    if (code) {
        const supabase = await createClient()
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        if (!error) return NextResponse.redirect(new URL(next, url.origin))
    }

    return NextResponse.redirect(new URL('/login?error=auth_callback_failed', url.origin))
}
