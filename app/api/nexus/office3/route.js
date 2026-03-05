import { withAuth } from '@/lib/apiHandler';

const NEXUS_URL = process.env.NEXUS_ACC_URL || 'https://nexusacc.itssx.com';
const NEXUS_KEY = process.env.NEXUS_API_KEY;

export const GET = withAuth(async (req) => {
    if (!NEXUS_KEY) {
        return Response.json({ error: 'NEXUS_API_KEY chưa được cấu hình' }, { status: 500 });
    }

    const res = await fetch(`${NEXUS_URL}/api/claude_code/office3`, {
        headers: {
            'Authorization': `Bearer ${NEXUS_KEY}`,
            'Content-Type': 'application/json',
        },
    });

    if (!res.ok) {
        return Response.json(
            { error: `Nexus API lỗi: ${res.status}` },
            { status: res.status }
        );
    }

    const data = await res.json();
    return Response.json(data);
});
