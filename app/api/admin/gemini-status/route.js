import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/apiHandler';

// Check Gemini API key status
export const GET = withAuth(async () => {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        return NextResponse.json({
            configured: false,
            status: 'missing',
            message: 'GEMINI_API_KEY chưa được cấu hình trong .env',
        });
    }

    // Test API with a simple request
    try {
        const res = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: 'Reply with just the word: OK' }] }],
                    generationConfig: { temperature: 0, maxOutputTokens: 10 },
                }),
            }
        );

        if (res.ok) {
            return NextResponse.json({
                configured: true,
                status: 'active',
                message: 'Gemini API hoạt động bình thường',
                model: 'gemini-2.0-flash',
                keyPreview: apiKey.slice(0, 8) + '...' + apiKey.slice(-4),
            });
        }

        const err = await res.json();
        return NextResponse.json({
            configured: true,
            status: 'error',
            message: err.error?.message || 'API key không hợp lệ hoặc hết quota',
            keyPreview: apiKey.slice(0, 8) + '...' + apiKey.slice(-4),
        });
    } catch (e) {
        return NextResponse.json({
            configured: true,
            status: 'error',
            message: `Lỗi kết nối: ${e.message}`,
            keyPreview: apiKey.slice(0, 8) + '...' + apiKey.slice(-4),
        });
    }
}, { roles: ['giam_doc'] });
