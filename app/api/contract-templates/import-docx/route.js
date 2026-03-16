import { withAuth } from '@/lib/apiHandler';
import { NextResponse } from 'next/server';
import { writeFile, readFile, unlink, readdir } from 'fs/promises';
import { execSync } from 'child_process';
import path from 'path';
import os from 'os';
import crypto from 'crypto';

export const POST = withAuth(async (request) => {
    const tmpDir = os.tmpdir();
    const uid = crypto.randomBytes(8).toString('hex');
    const inputPath = path.join(tmpDir, `import_${uid}.docx`);
    let outputPath = '';

    try {
        const formData = await request.formData();
        const file = formData.get('file');

        if (!file || !file.name) {
            return NextResponse.json({ error: 'Chưa chọn file' }, { status: 400 });
        }

        const ext = file.name.toLowerCase().split('.').pop();
        if (!['docx', 'doc'].includes(ext)) {
            return NextResponse.json({ error: 'Chỉ hỗ trợ file .docx / .doc' }, { status: 400 });
        }

        // 1. Ghi file tạm
        const arrayBuffer = await file.arrayBuffer();
        await writeFile(inputPath, Buffer.from(arrayBuffer));

        // 2. Gọi LibreOffice headless convert → HTML
        try {
            execSync(
                `libreoffice --headless --norestore --convert-to html --outdir "${tmpDir}" "${inputPath}"`,
                { timeout: 30000, stdio: 'pipe' }
            );
        } catch (loErr) {
            console.error('LibreOffice error:', loErr.stderr?.toString());
            // Fallback: thử soffice (alias khác)
            try {
                execSync(
                    `soffice --headless --norestore --convert-to html --outdir "${tmpDir}" "${inputPath}"`,
                    { timeout: 30000, stdio: 'pipe' }
                );
            } catch {
                return NextResponse.json(
                    { error: 'LibreOffice chưa cài trên server. Liên hệ admin.' },
                    { status: 500 }
                );
            }
        }

        // 3. Đọc file HTML output
        outputPath = path.join(tmpDir, `import_${uid}.html`);
        let html = await readFile(outputPath, 'utf-8');

        // 4. Extract body content (LibreOffice output full HTML page)
        const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
        if (bodyMatch) {
            html = bodyMatch[1];
        }

        // 5. Extract inline styles từ <head> → inject vào content
        const styleMatch = html.match(/<style[^>]*>([\s\S]*?)<\/style>/gi);
        let styles = '';
        if (!bodyMatch && styleMatch) {
            // Nếu không tách được body, lấy cả styles
            styles = styleMatch.join('\n');
        }

        // 6. Fix image paths: LibreOffice tạo thư mục ảnh cạnh file HTML
        //    Convert ảnh local → base64 embedded
        const imgDir = path.join(tmpDir, `import_${uid}_html_files`);
        // Thử đọc ảnh nếu có
        try {
            const imgDirAlt = path.join(tmpDir, `import_${uid}.html_files`);
            const possibleDirs = [imgDir, imgDirAlt];
            
            for (const dir of possibleDirs) {
                try {
                    const files = await readdir(dir);
                    for (const imgFile of files) {
                        const imgPath = path.join(dir, imgFile);
                        const imgData = await readFile(imgPath);
                        const mimeType = imgFile.endsWith('.png') ? 'image/png' 
                            : imgFile.endsWith('.gif') ? 'image/gif'
                            : 'image/jpeg';
                        const b64 = `data:${mimeType};base64,${imgData.toString('base64')}`;
                        
                        // Replace references trong HTML
                        html = html.replace(
                            new RegExp(`(src=["'])([^"']*${imgFile.replace('.', '\\.')})`, 'g'),
                            `$1${b64}`
                        );
                    }
                    // Cleanup img dir
                    for (const f of files) {
                        await unlink(path.join(dir, f)).catch(() => {});
                    }
                } catch {
                    // Dir không tồn tại, skip
                }
            }
        } catch {
            // No images, that's fine
        }

        // 7. Cleanup empty lines thừa
        html = html.replace(/\n{3,}/g, '\n\n').trim();

        // Nếu có styles, prefix vào html
        if (styles) {
            html = styles + '\n' + html;
        }

        return NextResponse.json({
            html,
            filename: file.name,
            messages: [],
        });
    } catch (error) {
        console.error('Import DOCX error:', error);
        return NextResponse.json({ error: 'Lỗi đọc file: ' + error.message }, { status: 500 });
    } finally {
        // Cleanup temp files
        await unlink(inputPath).catch(() => {});
        if (outputPath) await unlink(outputPath).catch(() => {});
    }
});
