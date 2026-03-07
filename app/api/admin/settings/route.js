import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

const TABLE_NAME = 'SystemSetting';

// GET all settings
export const GET = withAuth(async () => {
    try {
        const settings = await prisma.$queryRawUnsafe(
            `SELECT key, value FROM "${TABLE_NAME}"`
        );
        const result = {};
        settings.forEach(s => { result[s.key] = s.value; });
        return NextResponse.json(result);
    } catch {
        // Table might not exist yet — return empty
        return NextResponse.json({});
    }
}, { roles: ['giam_doc'] });

// PUT update settings — batch upsert in single transaction
export const PUT = withAuth(async (request) => {
    const body = await request.json();

    // Ensure table exists
    try {
        await prisma.$executeRawUnsafe(`
            CREATE TABLE IF NOT EXISTS "${TABLE_NAME}" (
                key VARCHAR(100) PRIMARY KEY,
                value TEXT DEFAULT '',
                "updatedAt" TIMESTAMP DEFAULT NOW()
            )
        `);
    } catch { }

    const entries = Object.entries(body).filter(([k, v]) => k && v !== undefined);

    if (entries.length === 0) {
        return NextResponse.json({ success: true });
    }

    // Build batch upsert — single query instead of N queries
    const values = entries.map((_, i) => `($${i * 2 + 1}, $${i * 2 + 2}, NOW())`).join(', ');
    const params = entries.flatMap(([k, v]) => [k, String(v || '')]);

    await prisma.$executeRawUnsafe(
        `INSERT INTO "${TABLE_NAME}" (key, value, "updatedAt")
         VALUES ${values}
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, "updatedAt" = NOW()`,
        ...params
    );

    return NextResponse.json({ success: true });
}, { roles: ['giam_doc'] });
