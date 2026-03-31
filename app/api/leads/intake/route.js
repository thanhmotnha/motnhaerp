import crypto from 'crypto';
import { withAuth } from '@/lib/apiHandler';
import { NextResponse } from 'next/server';
import { getSetting } from '@/lib/settingsHelper';
import { processLead } from '@/lib/leadIntake';

function timingSafeEqual(a, b) {
    const bufA = Buffer.from(String(a ?? ''));
    const bufB = Buffer.from(String(b ?? ''));
    if (bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
}

export const POST = withAuth(async (request) => {
    // Validate API key
    const apiKey = request.headers.get('x-api-key');
    const storedKey = await getSetting('leadApiKey');
    if (!storedKey || !timingSafeEqual(apiKey, storedKey)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, phone, email, source = 'Website', notes, utmCampaign } = body;

    if (!name || !phone) {
        return NextResponse.json({ error: 'name và phone là bắt buộc' }, { status: 400 });
    }

    const result = await processLead({ name, phone, email, source, notes, utmCampaign });

    return NextResponse.json(result, { status: result.created ? 201 : 200 });
}, { public: true });
