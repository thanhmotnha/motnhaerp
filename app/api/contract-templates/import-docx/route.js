import { withAuth } from '@/lib/apiHandler';
import { NextResponse } from 'next/server';
import mammoth from 'mammoth';

export const POST = withAuth(async (request) => {
    try {
        const formData = await request.formData();
        const file = formData.get('file');

        if (!file || !file.name) {
            return NextResponse.json({ error: 'Chưa chọn file' }, { status: 400 });
        }

        // Validate file type
        const ext = file.name.toLowerCase().split('.').pop();
        if (!['docx', 'doc'].includes(ext)) {
            return NextResponse.json({ error: 'Chỉ hỗ trợ file .docx' }, { status: 400 });
        }

        // Read file buffer
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Convert DOCX to HTML using mammoth
        const result = await mammoth.convertToHtml(
            { buffer },
            {
                styleMap: [
                    "p[style-name='Heading 1'] => h1:fresh",
                    "p[style-name='Heading 2'] => h2:fresh",
                    "p[style-name='Heading 3'] => h3:fresh",
                    "b => strong",
                    "i => em",
                    "u => u",
                    "strike => s",
                ],
            }
        );

        // Clean up the HTML a bit
        let html = result.value || '';
        
        // Remove empty paragraphs
        html = html.replace(/<p>\s*<\/p>/g, '');

        return NextResponse.json({
            html,
            filename: file.name,
            messages: result.messages || [],
        });
    } catch (error) {
        console.error('Import DOCX error:', error);
        return NextResponse.json({ error: 'Lỗi đọc file: ' + error.message }, { status: 500 });
    }
});
