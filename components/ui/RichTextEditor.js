'use client';
import { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import { StarterKit } from '@tiptap/starter-kit';
import { Underline } from '@tiptap/extension-underline';
import { TextAlign } from '@tiptap/extension-text-align';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import { Link } from '@tiptap/extension-link';
import { Image } from '@tiptap/extension-image';
import { Placeholder } from '@tiptap/extension-placeholder';
import { Color } from '@tiptap/extension-color';
import { TextStyle } from '@tiptap/extension-text-style';
import { FontFamily } from '@tiptap/extension-font-family';
import { Highlight } from '@tiptap/extension-highlight';

// ─── Toolbar Button ──────────────────────────────────
function TBtn({ onClick, active, title, children, disabled }) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            title={title}
            style={{
                background: active ? 'var(--primary, #3b82f6)' : 'transparent',
                color: active ? '#fff' : 'var(--text, #334155)',
                border: 'none',
                borderRadius: 5,
                padding: '4px 7px',
                cursor: disabled ? 'not-allowed' : 'pointer',
                fontSize: 13,
                fontWeight: 600,
                lineHeight: 1,
                opacity: disabled ? 0.4 : 1,
                minWidth: 28,
                height: 28,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
            }}
        >
            {children}
        </button>
    );
}

// ─── Toolbar Separator ───────────────────────────────
function TSep() {
    return <span style={{ width: 1, height: 20, background: '#e2e8f0', margin: '0 3px' }} />;
}

// ─── Variable Dropdown ───────────────────────────────
function VariableDropdown({ variables, onInsert }) {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);

    useEffect(() => {
        const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    if (!variables?.length) return null;

    return (
        <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
            <TBtn onClick={() => setOpen(!open)} title="Chèn biến">{`{ }`} Biến</TBtn>
            {open && (
                <div style={{
                    position: 'absolute', top: '100%', left: 0, zIndex: 1000,
                    background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8,
                    boxShadow: '0 8px 24px rgba(0,0,0,0.12)', minWidth: 280,
                    maxHeight: 300, overflow: 'auto', marginTop: 4,
                }}>
                    {variables.map(v => (
                        <button
                            key={v.key}
                            type="button"
                            onClick={() => { onInsert(v.key); setOpen(false); }}
                            style={{
                                display: 'block', width: '100%', textAlign: 'left',
                                padding: '8px 14px', border: 'none', background: 'transparent',
                                cursor: 'pointer', fontSize: 13, lineHeight: 1.4,
                            }}
                            onMouseEnter={e => e.target.style.background = '#f1f5f9'}
                            onMouseLeave={e => e.target.style.background = 'transparent'}
                        >
                            <span style={{ fontFamily: 'monospace', color: '#3b82f6', fontWeight: 600 }}>
                                {`{{${v.key}}}`}
                            </span>
                            <span style={{ color: '#64748b', marginLeft: 8 }}>— {v.label}</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

// ─── Font Size Select ────────────────────────────────
function FontSizeSelect({ editor }) {
    const sizes = ['11px', '12px', '13px', '14px', '15px', '16px', '18px', '20px', '22px', '24px', '28px', '32px'];

    return (
        <select
            onChange={(e) => {
                if (e.target.value === '') {
                    editor.chain().focus().unsetMark('textStyle').run();
                } else {
                    editor.chain().focus().setMark('textStyle', { fontSize: e.target.value }).run();
                }
            }}
            style={{
                border: '1px solid #e2e8f0', borderRadius: 5, padding: '3px 4px',
                fontSize: 12, background: '#fff', cursor: 'pointer', height: 28,
            }}
            title="Cỡ chữ"
            defaultValue="14px"
        >
            {sizes.map(s => <option key={s} value={s}>{parseInt(s)}pt</option>)}
        </select>
    );
}

// ─── Font Family Select ──────────────────────────────
function FontFamilySelect({ editor }) {
    const fonts = [
        { label: 'Times New Roman', value: 'Times New Roman' },
        { label: 'Arial', value: 'Arial' },
        { label: 'Roboto', value: 'Roboto' },
        { label: 'Georgia', value: 'Georgia' },
        { label: 'Tahoma', value: 'Tahoma' },
        { label: 'Verdana', value: 'Verdana' },
        { label: 'Courier New', value: 'Courier New' },
    ];

    return (
        <select
            onChange={(e) => {
                if (e.target.value === '') {
                    editor.chain().focus().unsetFontFamily().run();
                } else {
                    editor.chain().focus().setFontFamily(e.target.value).run();
                }
            }}
            style={{
                border: '1px solid #e2e8f0', borderRadius: 5, padding: '3px 4px',
                fontSize: 12, background: '#fff', cursor: 'pointer', maxWidth: 140, height: 28,
            }}
            title="Font chữ"
            defaultValue="Times New Roman"
        >
            {fonts.map(f => <option key={f.value} value={f.value} style={{ fontFamily: f.value }}>{f.label}</option>)}
        </select>
    );
}

// ─── Custom fontSize as TextStyle attribute ──────────
const CustomTextStyle = TextStyle.extend({
    addAttributes() {
        return {
            ...this.parent?.(),
            fontSize: {
                default: null,
                parseHTML: el => el.style.fontSize || null,
                renderHTML: attrs => {
                    if (!attrs.fontSize) return {};
                    return { style: `font-size: ${attrs.fontSize}` };
                },
            },
        };
    },
});

// ─── Toolbar Component ───────────────────────────────
function Toolbar({ editor, variables }) {
    if (!editor) return null;

    const addLink = () => {
        const url = prompt('Nhập URL:');
        if (url) editor.chain().focus().setLink({ href: url }).run();
    };

    const addImage = () => {
        const url = prompt('Nhập URL hình ảnh:');
        if (url) editor.chain().focus().setImage({ src: url }).run();
    };

    const insertTable = () => {
        editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
    };

    return (
        <div style={{
            display: 'flex', flexWrap: 'wrap', gap: 2, padding: '6px 10px',
            borderBottom: '1px solid #e2e8f0', background: '#f8fafc',
            borderRadius: '10px 10px 0 0', alignItems: 'center',
        }}>
            {/* Undo/Redo */}
            <TBtn onClick={() => editor.chain().focus().undo().run()} title="Hoàn tác" disabled={!editor.can().undo()}>↩</TBtn>
            <TBtn onClick={() => editor.chain().focus().redo().run()} title="Làm lại" disabled={!editor.can().redo()}>↪</TBtn>
            <TSep />

            {/* Font */}
            <FontFamilySelect editor={editor} />
            <FontSizeSelect editor={editor} />
            <TSep />

            {/* Format */}
            <TBtn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} title="Đậm"><b>B</b></TBtn>
            <TBtn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title="Nghiêng"><i>I</i></TBtn>
            <TBtn onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive('underline')} title="Gạch chân"><u>U</u></TBtn>
            <TBtn onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive('strike')} title="Gạch ngang"><s>S</s></TBtn>
            <TSep />

            {/* Colors */}
            <label title="Màu chữ" style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', fontSize: 13, fontWeight: 600, padding: '0 4px' }}>
                A
                <input
                    type="color"
                    onChange={(e) => editor.chain().focus().setColor(e.target.value).run()}
                    style={{ width: 18, height: 18, border: 'none', cursor: 'pointer', marginLeft: 2 }}
                    defaultValue="#1e293b"
                />
            </label>
            <label title="Màu nền" style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', fontSize: 13, fontWeight: 600, padding: '0 4px' }}>
                🖌
                <input
                    type="color"
                    onChange={(e) => editor.chain().focus().toggleHighlight({ color: e.target.value }).run()}
                    style={{ width: 18, height: 18, border: 'none', cursor: 'pointer', marginLeft: 2 }}
                    defaultValue="#fef08a"
                />
            </label>
            <TSep />

            {/* Align */}
            <TBtn onClick={() => editor.chain().focus().setTextAlign('left').run()} active={editor.isActive({ textAlign: 'left' })} title="Trái">≡</TBtn>
            <TBtn onClick={() => editor.chain().focus().setTextAlign('center').run()} active={editor.isActive({ textAlign: 'center' })} title="Giữa">☰</TBtn>
            <TBtn onClick={() => editor.chain().focus().setTextAlign('right').run()} active={editor.isActive({ textAlign: 'right' })} title="Phải">≡</TBtn>
            <TBtn onClick={() => editor.chain().focus().setTextAlign('justify').run()} active={editor.isActive({ textAlign: 'justify' })} title="Đều">⊞</TBtn>
            <TSep />

            {/* Lists */}
            <TBtn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} title="Dấu chấm">•</TBtn>
            <TBtn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} title="Số thứ tự">1.</TBtn>
            <TSep />

            {/* Heading */}
            <TBtn onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive('heading', { level: 1 })} title="Tiêu đề 1">H1</TBtn>
            <TBtn onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading', { level: 2 })} title="Tiêu đề 2">H2</TBtn>
            <TBtn onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive('heading', { level: 3 })} title="Tiêu đề 3">H3</TBtn>
            <TSep />

            {/* Table/Link/Image */}
            <TBtn onClick={insertTable} title="Chèn bảng">📊</TBtn>
            <TBtn onClick={addLink} active={editor.isActive('link')} title="Chèn link">🔗</TBtn>
            <TBtn onClick={addImage} title="Chèn ảnh">🖼</TBtn>
            <TBtn onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Đường kẻ">—</TBtn>
            <TSep />

            {/* Variables */}
            <VariableDropdown variables={variables} onInsert={(key) => editor.chain().focus().insertContent(`{{${key}}}`).run()} />
        </div>
    );
}

// ─── Main Component ──────────────────────────────────
export default function RichTextEditor({ value = '', onChange, placeholder = 'Nhập nội dung...', variables = [], style = {}, editorKey = 0 }) {
    const onChangeRef = useRef(onChange);
    onChangeRef.current = onChange;
    const valueRef = useRef(value);
    valueRef.current = value;
    const prevKeyRef = useRef(editorKey);

    const extensions = useMemo(() => [
        StarterKit.configure({
            heading: { levels: [1, 2, 3] },
        }),
        Underline,
        CustomTextStyle,
        FontFamily,
        Color,
        Highlight.configure({ multicolor: true }),
        TextAlign.configure({ types: ['heading', 'paragraph'] }),
        Table.configure({ resizable: true }),
        TableRow,
        TableCell,
        TableHeader,
        Link.configure({ openOnClick: false }),
        Image,
        Placeholder.configure({ placeholder }),
    ], [placeholder]);

    const editor = useEditor({
        extensions,
        content: value,
        onUpdate: ({ editor: ed }) => {
            onChangeRef.current?.(ed.getHTML());
        },
    }); // NO deps → editor created once, never re-created

    // Chỉ setContent khi editorKey thay đổi (áp mẫu / import template)
    useEffect(() => {
        if (editor && prevKeyRef.current !== editorKey) {
            prevKeyRef.current = editorKey;
            editor.commands.setContent(valueRef.current || '', false);
        }
    }, [editor, editorKey]);

    return (
        <div style={{
            border: '1px solid var(--border, #e2e8f0)',
            borderRadius: 10,
            background: '#fff',
            boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
            ...style,
        }}>
            <Toolbar editor={editor} variables={variables} />
            <EditorContent
                editor={editor}
                style={{ minHeight: 400 }}
            />
            <style jsx global>{`
                @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap');

                .tiptap {
                    font-family: 'Times New Roman', Times, serif;
                    font-size: 14px;
                    line-height: 1.8;
                    color: #1e293b;
                    padding: 20px 28px;
                    min-height: 400px;
                    outline: none;
                }
                .tiptap:focus { outline: none; }
                .tiptap h1 { font-size: 22px; font-weight: 800; margin: 18px 0 10px; color: #0f172a; }
                .tiptap h2 { font-size: 18px; font-weight: 700; margin: 15px 0 8px; color: #1e293b; }
                .tiptap h3 { font-size: 15px; font-weight: 700; margin: 12px 0 6px; color: #334155; }
                .tiptap p { margin: 6px 0; }
                .tiptap ul, .tiptap ol { padding-left: 24px; margin: 8px 0; }
                .tiptap table { border-collapse: collapse; width: 100%; margin: 12px 0; }
                .tiptap td, .tiptap th { border: 1px solid #cbd5e1; padding: 6px 10px; min-width: 50px; vertical-align: top; }
                .tiptap th { background: #f1f5f9; font-weight: 700; text-align: left; }
                .tiptap img { max-width: 100%; height: auto; border-radius: 4px; }
                .tiptap blockquote { border-left: 3px solid #3b82f6; padding-left: 16px; margin: 12px 0; color: #64748b; font-style: italic; }
                .tiptap a { color: #2563eb; }
                .tiptap hr { border: 0; border-top: 1px solid #e2e8f0; margin: 16px 0; }
                .tiptap p.is-editor-empty:first-child::before {
                    content: attr(data-placeholder);
                    float: left;
                    color: #94a3b8;
                    pointer-events: none;
                    height: 0;
                }
                .tiptap .tableWrapper { overflow-x: auto; margin: 12px 0; }
                .tiptap table .selectedCell { background: #dbeafe; }
            `}</style>
        </div>
    );
}
