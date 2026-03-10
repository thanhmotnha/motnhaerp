import { NextResponse } from 'next/server';

// Extract amount from bank transfer screenshot using Gemini Flash Vision
// Free tier: 15 RPM, 1M tokens/day
export async function POST(request) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return NextResponse.json({ error: 'GEMINI_API_KEY not configured' }, { status: 500 });

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
                                text: `Analyze this bank transfer screenshot. Extract ONLY the transfer amount (số tiền chuyển khoản).
Return ONLY a JSON object with this exact format, nothing else:
{"amount": 1234567, "formatted": "1.234.567"}
If you cannot find an amount, return: {"amount": 0, "formatted": "0"}
Do NOT include any explanation, just the JSON.`
                            },
                            {
                                inlineData: { mimeType, data: base64 }
                            }
                        ]
                    }],
                    generationConfig: {
                        temperature: 0,
                        maxOutputTokens: 100,
                    }
                }),
            }
        );

        if (!res.ok) {
            const err = await res.text();
            console.error('Gemini error:', err);
            return NextResponse.json({ error: 'AI vision error' }, { status: 500 });
        }

        const data = await res.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

        // Parse JSON from response (handle markdown code blocks)
        const jsonMatch = text.match(/\{[^}]+\}/);
        if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            return NextResponse.json({
                amount: Number(parsed.amount) || 0,
                formatted: parsed.formatted || '0',
            });
        }

        return NextResponse.json({ amount: 0, formatted: '0' });
    } catch (e) {
        console.error('OCR error:', e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
