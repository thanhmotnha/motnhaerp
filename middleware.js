import { getToken } from 'next-auth/jwt';
import { NextResponse } from 'next/server';

function corsHeaders(response) {
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return response;
}

export async function middleware(request) {
    const { pathname } = request.nextUrl;

    // Handle CORS preflight for API routes
    if (request.method === 'OPTIONS' && pathname.startsWith('/api/')) {
        return corsHeaders(new NextResponse(null, { status: 200 }));
    }

    // Public paths - no auth required
    const publicPaths = ['/login', '/api/auth', '/progress', '/public', '/api/public'];
    const isPublic = publicPaths.some(p => pathname.startsWith(p));
    if (isPublic) {
        const res = NextResponse.next();
        if (pathname.startsWith('/api/')) return corsHeaders(res);
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
        return corsHeaders(NextResponse.next());
    }

    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });

    if (!token) {
        // API routes return 401
        if (pathname.startsWith('/api/')) {
            return corsHeaders(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }));
        }
        // Pages redirect to login
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('callbackUrl', pathname);
        return NextResponse.redirect(loginUrl);
    }

    const res = NextResponse.next();
    if (pathname.startsWith('/api/')) return corsHeaders(res);
    return res;
}

export const config = {
    matcher: ['/((?!_next/static|_next/image|favicon.ico|uploads).*)'],
};
