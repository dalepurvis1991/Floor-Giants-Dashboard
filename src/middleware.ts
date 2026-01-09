import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
    const session = request.cookies.get('session');

    // Public paths that don't need auth
    if (
        request.nextUrl.pathname.startsWith('/api/auth') ||
        request.nextUrl.pathname === '/login' ||
        request.nextUrl.pathname.startsWith('/_next') ||
        request.nextUrl.pathname.includes('.') // Static files
    ) {
        return NextResponse.next();
    }

    // If no session, redirect to login
    if (!session) {
        const loginUrl = new URL('/login', request.url);
        return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/((?!api/auth|_next/static|_next/image|favicon.ico).*)'],
};
