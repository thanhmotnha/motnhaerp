import { withAuth } from '@/lib/apiHandler';
import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { getSetting } from '@/lib/settingsHelper';
import { processLead } from '@/lib/leadIntake';

// GET — Facebook webhook verification challenge
export const GET = withAuth(async (request) => {
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get('hub.mode');
    const token = searchParams.get('hub.verify_token');
    const challenge = searchParams.get('hub.challenge');

    const storedToken = await getSetting('facebookVerifyToken');
    if (mode === 'subscribe' && token === storedToken) {
        return new Response(challenge, { status: 200 });
    }
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}, { public: true });

// POST — Facebook Lead Ads webhook
export const POST = withAuth(async (request) => {
    const appSecret = await getSetting('facebookAppSecret');
    const pageToken = await getSetting('facebookPageToken');

    // Verify HMAC signature
    const sig = request.headers.get('x-hub-signature-256');
    const rawBody = await request.text();

    if (appSecret && sig) {
        const expected = 'sha256=' + crypto
            .createHmac('sha256', appSecret)
            .update(rawBody)
            .digest('hex');
        if (sig !== expected) {
            return NextResponse.json({ error: 'Invalid signature' }, { status: 403 });
        }
    }

    const body = JSON.parse(rawBody);

    // Process each leadgen event (Facebook sends batches)
    const entries = body?.entry ?? [];
    for (const entry of entries) {
        for (const change of entry.changes ?? []) {
            if (change.field !== 'leadgen') continue;
            const leadgenId = change.value?.leadgen_id;
            if (!leadgenId || !pageToken) continue;

            // Fetch lead data from Graph API
            try {
                const res = await fetch(
                    `https://graph.facebook.com/v19.0/${leadgenId}?fields=id,field_data&access_token=${pageToken}`
                );
                const lead = await res.json();
                if (lead.error) continue;

                // Parse field_data array: [{ name: 'full_name', values: ['...'] }, ...]
                const fields = {};
                for (const f of lead.field_data ?? []) {
                    fields[f.name] = f.values?.[0] ?? '';
                }

                const name = fields['full_name'] || fields['name'] || 'Khách FB';
                const phone = fields['phone_number'] || fields['phone'] || '';
                const email = fields['email'] || '';

                await processLead({
                    name,
                    phone,
                    email,
                    source: 'Facebook Lead Ads',
                    facebookLeadId: leadgenId,
                });
            } catch (e) {
                console.error('[FB Leads webhook]', e.message);
            }
        }
    }

    // Facebook requires 200 OK quickly
    return NextResponse.json({ received: true });
}, { public: true });
