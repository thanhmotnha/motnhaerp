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

        const ext = file.name.toLowerCase().split('.').pop();
        if (!['docx', 'doc'].includes(ext)) {
            return NextResponse.json({ error: 'Chỉ hỗ trợ file .docx' }, { status: 400 });
        }

        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Convert DOCX → HTML, giữ format gốc tối đa
        const result = await mammoth.convertToHtml(
            { buffer },
            {
                styleMap: [
                    "p[style-name='Heading 1'] => h1:fresh",
                    "p[style-name='Heading 2'] => h2:fresh",
                    "p[style-name='Heading 3'] => h3:fresh",
                    "p[style-name='Title'] => h1.title:fresh",
                    "b => strong",
                    "i => em",
                    "u => u",
                    "strike => s",
                    "comment-reference => sup",
                ],
                // Giữ hình ảnh embedded
                convertImage: mammoth.images.imgElement(function(image) {
                    return image.read("base64").then(function(imageBuffer) {
                        return {
                            src: "data:" + image.contentType + ";base64," + imageBuffer,
                        };
                    });
                }),
            }
        );

        let html = result.value || '';

        // Xóa empty paragraphs thừa
        html = html.replace(/<p>\s*<\/p>/g, '');

        // Wrap content trong div có default styles giống Word
        html = `<div style="font-family: 'Times New Roman', serif; font-size: 14px; line-height: 1.6;">${html}</div>`;

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
