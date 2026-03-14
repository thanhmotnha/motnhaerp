'use client';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import Image from '@tiptap/extension-image';
import Color from '@tiptap/extension-color';
import TextStyle from '@tiptap/extension-text-style';
import Placeholder from '@tiptap/extension-placeholder';
import { useState, useEffect, useCallback, useRef } from 'react';

const TOOLBAR_BTN = {
    padding: '4px 8px', border: '1px solid var(--border)', borderRadius: 4,
    background: 'var(--bg-primary)', cursor: 'pointer', fontSize: 13,
    minWidth: 30, textAlign: 'center', lineHeight: 1.2, transition: 'all 0.15s',
};
const ACTIVE_BTN = { ...TOOLBAR_BTN, background: 'var(--accent-primary)', color: '#fff', borderColor: 'var(--accent-primary)' };

export default function RichTextEditor({ value = '', onChange, placeholder = 'Nhập nội dung...', variables = [], style = {} }) {
    const [varDropdown, setVarDropdown] = useState(false);
    const dropdownRef = useRef(null);
    const onChangeRef = useRef(onChange);
    onChangeRef.current = onChange;

    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                heading: { levels: [1, 2, 3] },
            }),
            Underline,
            TextAlign.configure({ types: ['heading', 'paragraph'] }),
            Table.configure({ resizable: true }),
            TableRow,
            TableCell,
            TableHeader,
            Image,
            Color,
            TextStyle,
            Placeholder.configure({ placeholder }),
        ],
        content: value,
        onUpdate: ({ editor }) => {
            onChangeRef.current?.(editor.getHTML());
        },
    });

    // Sync external value changes
    const lastValue = useRef(value);
    useEffect(() => {
        if (editor && value !== lastValue.current) {
            const currentHTML = editor.getHTML();
            if (value !== currentHTML) {
                editor.commands.setContent(value, false);
            }
            lastValue.current = value;
        }
    }, [value, editor]);

    // Close dropdown on outside click
    useEffect(() => {
        const handler = (e) => { if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setVarDropdown(false); };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const insertVariable = useCallback((varKey) => {
        if (!editor) return;
        editor.chain().focus().insertContent(`{{${varKey}}}`).run();
        setVarDropdown(false);
    }, [editor]);

    if (!editor) return null;

    const btn = (active, onClick, children, title) => (
        <button type="button" style={active ? ACTIVE_BTN : TOOLBAR_BTN} onClick={onClick} title={title}>{children}</button>
    );

    return (
        <div style={{ border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden', ...style }}>
            {/* Toolbar */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 2, padding: '6px 8px', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)', alignItems: 'center' }}>
                {/* Text format */}
                {btn(editor.isActive('bold'), () => editor.chain().focus().toggleBold().run(), <b>B</b>, 'Bold')}
                {btn(editor.isActive('italic'), () => editor.chain().focus().toggleItalic().run(), <i>I</i>, 'Italic')}
                {btn(editor.isActive('underline'), () => editor.chain().focus().toggleUnderline().run(), <u>U</u>, 'Underline')}
                {btn(editor.isActive('strike'), () => editor.chain().focus().toggleStrike().run(), <s>S</s>, 'Strikethrough')}

                <span style={{ width: 1, height: 20, background: 'var(--border)', margin: '0 4px' }} />

                {/* Headings */}
                {btn(editor.isActive('heading', { level: 1 }), () => editor.chain().focus().toggleHeading({ level: 1 }).run(), 'H1', 'Heading 1')}
                {btn(editor.isActive('heading', { level: 2 }), () => editor.chain().focus().toggleHeading({ level: 2 }).run(), 'H2', 'Heading 2')}
                {btn(editor.isActive('heading', { level: 3 }), () => editor.chain().focus().toggleHeading({ level: 3 }).run(), 'H3', 'Heading 3')}

                <span style={{ width: 1, height: 20, background: 'var(--border)', margin: '0 4px' }} />

                {/* Lists */}
                {btn(editor.isActive('bulletList'), () => editor.chain().focus().toggleBulletList().run(), '•', 'Bullet list')}
                {btn(editor.isActive('orderedList'), () => editor.chain().focus().toggleOrderedList().run(), '1.', 'Numbered list')}

                <span style={{ width: 1, height: 20, background: 'var(--border)', margin: '0 4px' }} />

                {/* Alignment */}
                {btn(editor.isActive({ textAlign: 'left' }), () => editor.chain().focus().setTextAlign('left').run(), '⬅', 'Align left')}
                {btn(editor.isActive({ textAlign: 'center' }), () => editor.chain().focus().setTextAlign('center').run(), '↔', 'Center')}
                {btn(editor.isActive({ textAlign: 'right' }), () => editor.chain().focus().setTextAlign('right').run(), '➡', 'Align right')}

                <span style={{ width: 1, height: 20, background: 'var(--border)', margin: '0 4px' }} />

                {/* Table */}
                {btn(false, () => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(), '⊞', 'Insert table')}

                <span style={{ width: 1, height: 20, background: 'var(--border)', margin: '0 4px' }} />

                {/* Undo/Redo */}
                {btn(false, () => editor.chain().focus().undo().run(), '↩', 'Undo')}
                {btn(false, () => editor.chain().focus().redo().run(), '↪', 'Redo')}

                {/* Variables dropdown */}
                {variables.length > 0 && (
                    <>
                        <span style={{ width: 1, height: 20, background: 'var(--border)', margin: '0 4px' }} />
                        <div style={{ position: 'relative' }} ref={dropdownRef}>
                            <button type="button" style={{ ...TOOLBAR_BTN, background: '#e0f2fe', color: '#0369a1', fontWeight: 700, fontSize: 12, padding: '4px 10px' }}
                                onClick={() => setVarDropdown(!varDropdown)}>
                                {'{ } Chèn biến ▾'}
                            </button>
                            {varDropdown && (
                                <div style={{
                                    position: 'absolute', top: '100%', left: 0, zIndex: 100,
                                    background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 8,
                                    boxShadow: '0 8px 30px rgba(0,0,0,0.15)', minWidth: 280, maxHeight: 320, overflow: 'auto',
                                    marginTop: 4,
                                }}>
                                    {variables.map(v => (
                                        <button key={v.key} type="button" onClick={() => insertVariable(v.key)}
                                            style={{
                                                display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                                                padding: '8px 14px', border: 'none', background: 'transparent',
                                                cursor: 'pointer', textAlign: 'left', fontSize: 12,
                                                borderBottom: '1px solid var(--border)',
                                            }}>
                                            <code style={{ background: '#e0f2fe', color: '#0369a1', padding: '2px 6px', borderRadius: 4, fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' }}>
                                                {`{{${v.key}}}`}
                                            </code>
                                            <span style={{ color: 'var(--text-muted)' }}>{v.label}</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>

            {/* Editor */}
            <div className="rte-content">
                <EditorContent editor={editor} />
            </div>

            {/* Editor styles */}
            <style>{`
                .rte-content .tiptap {
                    padding: 16px 20px;
                    min-height: 300px;
                    outline: none;
                    font-size: 14px;
                    line-height: 1.7;
                    color: var(--text-primary);
                }
                .rte-content .tiptap p.is-editor-empty:first-child::before {
                    content: attr(data-placeholder);
                    float: left;
                    color: var(--text-muted);
                    pointer-events: none;
                    height: 0;
                }
                .rte-content .tiptap h1 { font-size: 22px; font-weight: 800; margin: 16px 0 8px; }
                .rte-content .tiptap h2 { font-size: 18px; font-weight: 700; margin: 14px 0 6px; }
                .rte-content .tiptap h3 { font-size: 15px; font-weight: 700; margin: 12px 0 4px; }
                .rte-content .tiptap ul, .rte-content .tiptap ol { padding-left: 24px; margin: 8px 0; }
                .rte-content .tiptap table { border-collapse: collapse; width: 100%; margin: 12px 0; }
                .rte-content .tiptap td, .rte-content .tiptap th {
                    border: 1px solid var(--border);
                    padding: 6px 10px;
                    min-width: 60px;
                    vertical-align: top;
                }
                .rte-content .tiptap th { background: var(--bg-secondary); font-weight: 700; }
                .rte-content .tiptap img { max-width: 100%; height: auto; border-radius: 4px; }
                .rte-content .tiptap blockquote {
                    border-left: 3px solid var(--accent-primary);
                    padding-left: 16px;
                    margin: 12px 0;
                    color: var(--text-muted);
                }
            `}</style>
        </div>
    );
}
