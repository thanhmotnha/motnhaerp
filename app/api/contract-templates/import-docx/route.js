import { withAuth } from '@/lib/apiHandler';
import { NextResponse } from 'next/server';
import { writeFile, readFile, unlink, readdir } from 'fs/promises';
import { execSync } from 'child_process';
import path from 'path';
import os from 'os';
import crypto from 'crypto';

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

// Detect LibreOffice command based on platform
function getLibreOfficeCommands() {
    const platform = os.platform();
    if (platform === 'win32') {
        return [
            '"C:\\Program Files\\LibreOffice\\program\\soffice.exe"',
            '"C:\\Program Files (x86)\\LibreOffice\\program\\soffice.exe"',
            'soffice',
        ];
    }
    if (platform === 'darwin') {
        return [
            '/Applications/LibreOffice.app/Contents/MacOS/soffice',
            'libreoffice',
            'soffice',
        ];
    }
    // Linux
    return ['libreoffice', 'soffice'];
}

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

        // Validate file size
        const arrayBuffer = await file.arrayBuffer();
        if (arrayBuffer.byteLength > MAX_FILE_SIZE) {
            return NextResponse.json({ error: `File quá lớn (tối đa ${MAX_FILE_SIZE / 1024 / 1024}MB)` }, { status: 400 });
        }

        // 1. Ghi file tạm
        await writeFile(inputPath, Buffer.from(arrayBuffer));

        // 2. Gọi LibreOffice headless convert → HTML (platform-aware)
        const commands = getLibreOfficeCommands();
        let converted = false;
        for (const cmd of commands) {
            try {
                execSync(
                    `${cmd} --headless --norestore --convert-to html --outdir "${tmpDir}" "${inputPath}"`,
                    { timeout: 30000, stdio: 'pipe' }
                );
                converted = true;
                break;
            } catch (err) {
                console.warn(`LibreOffice command failed: ${cmd}`, err.stderr?.toString()?.slice(0, 200));
            }
        }
        if (!converted) {
            return NextResponse.json(
                { error: 'LibreOffice chưa cài trên server. Liên hệ admin.' },
                { status: 500 }
            );
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

        // 7. Clean inline styles trên headings (only strip margin: 0 that causes compact text)
        html = html.replace(/<(h[1-6])([^>]*?)style="([^"]*)"([^>]*?)>/gi, (match, tag, pre, style, post) => {
            // Only strip zero margins/padding that cause cramped headings
            const cleaned = style
                .replace(/margin(-top|-bottom|-left|-right)?\s*:\s*0(px|pt|em|rem)?\s*;?/gi, '')
                .replace(/padding(-top|-bottom|-left|-right)?\s*:\s*0(px|pt|em|rem)?\s*;?/gi, '')
                .trim();
            if (!cleaned) return `<${tag}${pre}${post}>`;
            return `<${tag}${pre}style="${cleaned}"${post}>`;
        });

        // 7b. Clean LibreOffice class names that TipTap doesn't understand
        html = html.replace(/class="[^"]*"/gi, '');

        // 7c. Replace <span> with inline styles that TipTap handles natively
        // Keep font-family, font-size, color, font-weight, text-decoration
        // Remove orphaned empty spans
        html = html.replace(/<span[^>]*style=""[^>]*>\s*<\/span>/gi, '');

        // 8. Cleanup empty lines thừa
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
