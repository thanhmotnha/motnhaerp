import { NextResponse } from 'next/server';

/**
 * Image proxy — bypasses CORS/hotlink restrictions.
 * GET /api/image-proxy?url=https://ancuong.com/...webp
 */
export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get('url');

    if (!url) {
        return NextResponse.json({ error: 'Missing url param' }, { status: 400 });
    }

    // Only allow whitelisted domains
    const allowed = ['ancuong.com', 'catalogue.ancuong.com'];
    try {
        const parsed = new URL(url);
        if (!allowed.some(d => parsed.hostname.endsWith(d))) {
            return NextResponse.json({ error: 'Domain not allowed' }, { status: 403 });
        }
    } catch {
        return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
    }

    try {
        const res = await fetch(url, {
            headers: {
                'Referer': 'https://ancuong.com/',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            },
        });

        if (!res.ok) {
            return NextResponse.json({ error: `Upstream ${res.status}` }, { status: res.status });
        }

        const contentType = res.headers.get('content-type') || 'image/webp';
        const buffer = await res.arrayBuffer();

        return new NextResponse(buffer, {
            headers: {
                'Content-Type': contentType,
                'Cache-Control': 'public, max-age=86400, immutable',
                'Access-Control-Allow-Origin': '*',
            },
        });
    } catch (e) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
