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

// PUT update settings
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

    // Upsert each setting
    for (const [key, value] of Object.entries(body)) {
        await prisma.$executeRawUnsafe(
            `INSERT INTO "${TABLE_NAME}" (key, value, "updatedAt")
             VALUES ($1, $2, NOW())
             ON CONFLICT (key) DO UPDATE SET value = $2, "updatedAt" = NOW()`,
            key, String(value || '')
        );
    }

    return NextResponse.json({ success: true });
}, { roles: ['giam_doc'] });
