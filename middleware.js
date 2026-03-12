import { getToken } from 'next-auth/jwt';
import { NextResponse } from 'next/server';

const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGINS || '*';

function corsHeaders(response, request) {
    const origin = request?.headers?.get('origin');
    // If ALLOWED_ORIGINS is set, validate; otherwise allow all (mobile compat)
    if (ALLOWED_ORIGIN === '*') {
        response.headers.set('Access-Control-Allow-Origin', '*');
    } else {
        const allowed = ALLOWED_ORIGIN.split(',').map(s => s.trim());
        if (origin && allowed.includes(origin)) {
            response.headers.set('Access-Control-Allow-Origin', origin);
            response.headers.set('Vary', 'Origin');
        }
    }
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return response;
}

export async function middleware(request) {
    const { pathname } = request.nextUrl;

    // Handle CORS preflight for API routes
    if (request.method === 'OPTIONS' && pathname.startsWith('/api/')) {
        return corsHeaders(new NextResponse(null, { status: 200 }), request);
    }

    // Public paths - no auth required
    const publicPaths = ['/login', '/api/auth', '/progress', '/public', '/api/public'];
    const isPublic = publicPaths.some(p => pathname.startsWith(p));
    if (isPublic) {
        const res = NextResponse.next();
        if (pathname.startsWith('/api/')) return corsHeaders(res, request);
        return res;
    }

    // Public PDF pages: /quotations/[id]/pdf
    if (/^\/quotations\/[^/]+\/pdf/.test(pathname)) return NextResponse.next();

    // Static files
    if (
        pathname.startsWith('/_next') ||
        pathname.startsWith('/favicon') ||
        pathname.startsWith('/uploads')
    ) {
        return NextResponse.next();
    }

    // API requests with Bearer token (mobile app) — let withAuth() handle auth
    if (pathname.startsWith('/api/') && request.headers.get('authorization')?.startsWith('Bearer ')) {
        return corsHeaders(NextResponse.next(), request);
    }

    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });

    if (!token) {
        // API routes return 401
        if (pathname.startsWith('/api/')) {
            return corsHeaders(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }), request);
        }
        // Pages redirect to login
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('callbackUrl', pathname);
        return NextResponse.redirect(loginUrl);
    }

    const res = NextResponse.next();
    if (pathname.startsWith('/api/')) return corsHeaders(res, request);
    return res;
}

export const config = {
    matcher: ['/((?!_next/static|_next/image|favicon.ico|uploads).*)'],
};
