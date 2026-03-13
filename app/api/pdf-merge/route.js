import { withAuth } from '@/lib/apiHandler';
import { NextResponse } from 'next/server';
import { mergePdfWithCovers } from '@/lib/pdfCoverMerger';

/**
 * POST /api/pdf-merge
 * Body (JSON): { pdfUrl: string, covers: { top: { url }, bottom: { url } } }
 * Returns: merged PDF as binary
 */
export const POST = withAuth(async (request) => {
    const { pdfUrl, covers } = await request.json();

    if (!pdfUrl) {
        return NextResponse.json({ error: 'pdfUrl is required' }, { status: 400 });
    }
    if (!covers?.top?.url && !covers?.bottom?.url) {
        return NextResponse.json({ error: 'At least one cover (top or bottom) is required' }, { status: 400 });
    }

    // Resolve base URL for relative paths
    const proto = request.headers.get('x-forwarded-proto') || 'http';
    const host = request.headers.get('host') || 'localhost:3000';
    const baseUrl = `${proto}://${host}`;

    // Fetch main PDF
    const fullPdfUrl = pdfUrl.startsWith('http') ? pdfUrl : `${baseUrl}${pdfUrl}`;
    const mainRes = await fetch(fullPdfUrl);
    if (!mainRes.ok) {
        return NextResponse.json({ error: `Cannot fetch main PDF: ${mainRes.status}` }, { status: 400 });
    }
    const mainBuffer = Buffer.from(await mainRes.arrayBuffer());

    // Merge
    const mergedBuffer = await mergePdfWithCovers(mainBuffer, covers, baseUrl);

    return new NextResponse(mergedBuffer, {
        headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': 'attachment; filename="merged.pdf"',
        },
    });
});
