import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';

// OCR budget table from image using Gemini Vision
export const POST = withAuth(async (request) => {
    let apiKey = process.env.GEMINI_API_KEY;
    try {
        const dbKey = await prisma.$queryRawUnsafe(`SELECT value FROM "SystemSetting" WHERE key = 'gemini_api_key' LIMIT 1`);
        if (dbKey?.[0]?.value) apiKey = dbKey[0].value;
    } catch { }
    if (!apiKey) return NextResponse.json({ error: 'GEMINI_API_KEY not configured — vào Settings → AI / Gemini API để cấu hình' }, { status: 500 });

    const formData = await request.formData();
    const file = formData.get('file');
    if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 });

    const bytes = await file.arrayBuffer();
    const base64 = Buffer.from(bytes).toString('base64');
    const mimeType = file.type || 'image/jpeg';

    try {
        const res = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        parts: [
                            {
                                text: `Analyze this image of a construction budget/material table (bảng dự toán vật tư xây dựng).

Extract ALL rows of materials/items from the table. For each row, extract:
- name: tên vật tư/hạng mục (Vietnamese)
- unit: đơn vị tính (kg, m3, cây, viên, thùng, cuộn, bộ, cái, m², m, tấn, công trình, ca, công...)
- qty: số lượng/khối lượng (number)
- unitPrice: đơn giá/giá gốc (number, no formatting)
- group: nhóm/phân loại nếu có (VD: "Vật liệu", "Nhân công", "Máy thi công")
- costType: "Vật tư" hoặc "Nhân công" hoặc "Thầu phụ" hoặc "Khác"

IMPORTANT:
- Skip header rows, title rows, group summary rows (like "I VẬT LIỆU", section totals)
- Skip "Tổng cộng" / total rows
- Include ALL individual material/item rows
- For costType: if the item is labor (nhân công) → "Nhân công", if equipment (máy) → "Khác", otherwise → "Vật tư"

Return ONLY a valid JSON array, no explanation:
[{"name":"Xi măng","unit":"tấn","qty":25,"unitPrice":1600000,"group":"Vật liệu","costType":"Vật tư"}, ...]

If you cannot identify any items, return: []`
                            },
                            {
                                inlineData: { mimeType, data: base64 }
                            }
                        ]
                    }],
                    generationConfig: {
                        temperature: 0,
                        maxOutputTokens: 4096,
                    }
                }),
            }
        );

        if (!res.ok) {
            const err = await res.text();
            console.error('Gemini OCR error:', err);
            return NextResponse.json({ error: 'AI vision error' }, { status: 500 });
        }

        const data = await res.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '[]';

        // Parse JSON from response (handle markdown code blocks)
        const jsonMatch = text.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
            const items = JSON.parse(jsonMatch[0]);
            return NextResponse.json({ items, raw: text });
        }

        return NextResponse.json({ items: [], raw: text });
    } catch (e) {
        console.error('OCR budget error:', e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
});
