'use client';
import { useRef, useCallback, useEffect, useState } from 'react';
import { Editor } from '@tinymce/tinymce-react';

// ─── Font & Size configs ────────────────────────────
const FONTS = [
    'Times New Roman=Times New Roman,Times,serif',
    'Arial=Arial,Helvetica,sans-serif',
    'Roboto=Roboto,sans-serif',
    'Georgia=Georgia,serif',
    'Tahoma=Tahoma,sans-serif',
    'Verdana=Verdana,sans-serif',
    'Courier New=Courier New,Courier,monospace',
].join(';');

const FONT_SIZES = '11px 12px 13px 14px 15px 16px 18px 20px 22px 24px 28px 32px 36px';

// ─── Content CSS for document feel ──────────────────
const CONTENT_STYLE = `
    @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap');

    body {
        font-family: 'Times New Roman', Times, serif;
        font-size: 14px;
        line-height: 1.8;
        color: #1e293b;
        padding: 20px 28px;
        max-width: 100%;
        margin: 0;
    }
    h1 { font-size: 22px; font-weight: 800; margin: 18px 0 10px; color: #0f172a; }
    h2 { font-size: 18px; font-weight: 700; margin: 15px 0 8px; color: #1e293b; }
    h3 { font-size: 15px; font-weight: 700; margin: 12px 0 6px; color: #334155; }
    p { margin: 6px 0; }
    ul, ol { padding-left: 24px; margin: 8px 0; }
    table { border-collapse: collapse; width: 100%; margin: 12px 0; }
    td, th { border: 1px solid #cbd5e1; padding: 6px 10px; min-width: 50px; vertical-align: top; }
    th { background: #f1f5f9; font-weight: 700; text-align: left; }
    img { max-width: 100%; height: auto; border-radius: 4px; }
    blockquote { border-left: 3px solid #3b82f6; padding-left: 16px; margin: 12px 0; color: #64748b; font-style: italic; }
    a { color: #2563eb; }
    hr { border: 0; border-top: 1px solid #e2e8f0; margin: 16px 0; }
`;

export default function RichTextEditor({ value = '', onChange, placeholder = 'Nhập nội dung...', variables = [], style = {} }) {
    const editorRef = useRef(null);
    const onChangeRef = useRef(onChange);
    const [ready, setReady] = useState(false);
    onChangeRef.current = onChange;

    // Sync external value changes (e.g. from import) — skip khi user đang gõ
    const isInternalChange = useRef(false);
    useEffect(() => {
        if (editorRef.current && !isInternalChange.current) {
            const currentHTML = editorRef.current.getContent();
            if (value !== currentHTML) {
                editorRef.current.setContent(value || '');
            }
        }
        isInternalChange.current = false;
    }, [value]);

    const handleEditorChange = useCallback((content) => {
        isInternalChange.current = true;
        onChangeRef.current?.(content);
    }, []);

    // Build variable menu items
    const setupVariableButton = useCallback((editor) => {
        if (!variables || variables.length === 0) return;

        editor.ui.registry.addMenuButton('variablesBtn', {
            text: '{ } Chèn biến',
            tooltip: 'Chèn biến tự động vào hợp đồng',
            fetch: (callback) => {
                const items = variables.map(v => ({
                    type: 'menuitem',
                    text: `{{${v.key}}} — ${v.label}`,
                    onAction: () => {
                        editor.insertContent(`{{${v.key}}}`);
                    },
                }));
                callback(items);
            },
        });
    }, [variables]);

    return (
        <div style={{
            border: '1px solid var(--border)',
            borderRadius: 10,
            background: '#fff',
            boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
            ...style
        }}>
            {!ready && (
                <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                    ⏳ Đang tải trình soạn thảo...
                </div>
            )}
            <div style={{ display: ready ? 'block' : 'none' }}>
                <Editor
                    tinymceScriptSrc="/tinymce/tinymce.min.js"
                    onInit={(evt, editor) => {
                        editorRef.current = editor;
                        setReady(true);
                    }}
                    initialValue={value}
                    onEditorChange={handleEditorChange}
                    init={{
                        license_key: 'gpl',
                        height: 500,
                        menubar: 'file edit view insert format table',
                        plugins: [
                            'advlist', 'autolink', 'lists', 'link', 'image', 'charmap',
                            'preview', 'anchor', 'searchreplace', 'visualblocks', 'code',
                            'fullscreen', 'insertdatetime', 'media', 'table', 'help',
                            'wordcount', 'pagebreak',
                        ],
                        toolbar1: 'undo redo | fontfamily fontsize | bold italic underline strikethrough | forecolor backcolor',
                        toolbar2: 'alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | table link image | variablesBtn | pagebreak | fullscreen preview',
                        font_family_formats: FONTS,
                        font_size_formats: FONT_SIZES,
                        content_style: CONTENT_STYLE,
                        placeholder: placeholder,
                        branding: false,
                        promotion: false,
                        statusbar: true,
                        resize: true,
                        language: 'vi',
                        language_url: '/tinymce/langs/vi.js',
                        // Document-like appearance
                        skin: 'oxide',
                        content_css: false,
                        // Table defaults
                        table_default_styles: {
                            'border-collapse': 'collapse',
                            'width': '100%',
                        },
                        table_default_attributes: {
                            border: '1',
                        },
                        // Paste cleanup
                        paste_as_text: false,
                        paste_retain_style_properties: 'color,font-size,font-family,background-color,text-align,text-decoration,font-weight,font-style',
                        paste_word_valid_elements: 'b,strong,i,em,h1,h2,h3,h4,p,br,table,tr,td,th,thead,tbody,ul,ol,li,a[href],span[style],div[style],sub,sup',
                        valid_styles: {
                            '*': 'font-family,font-size,color,background-color,text-align,text-decoration,font-weight,font-style,margin,margin-left,margin-right,padding,line-height,text-indent,border,border-collapse,width,height',
                        },
                        // Setup custom buttons
                        setup: (editor) => {
                            setupVariableButton(editor);
                        },
                        // Auto-save
                        autosave_interval: '30s',
                    }}
                />
            </div>
        </div>
    );
}
