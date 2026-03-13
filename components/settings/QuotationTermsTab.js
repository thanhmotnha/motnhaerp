'use client';
import { useState } from 'react';

const DEFAULT_TERMS = [
    'Báo giá có hiệu lực 30 ngày kể từ ngày lập.',
    'Thanh toán theo tiến độ giai đoạn được thỏa thuận trong hợp đồng.',
    'Giá trên đã bao gồm nhân công, vật tư theo bảng chi tiết.',
    'Một Nhà cam kết thi công đúng tiến độ, đúng chất lượng.',
    'Mọi thay đổi phát sinh sẽ được thông báo và xác nhận trước khi thực hiện.',
];

export default function QuotationTermsTab({ value, onChange }) {
    const terms = Array.isArray(value) && value.length > 0 ? value : [...DEFAULT_TERMS];
    const [dragIdx, setDragIdx] = useState(null);

    const update = (idx, text) => {
        const next = [...terms];
        next[idx] = text;
        onChange(next);
    };

    const remove = (idx) => {
        if (terms.length <= 1) return;
        onChange(terms.filter((_, i) => i !== idx));
    };

    const add = () => onChange([...terms, '']);

    const moveUp = (idx) => {
        if (idx === 0) return;
        const next = [...terms];
        [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
        onChange(next);
    };

    const moveDown = (idx) => {
        if (idx >= terms.length - 1) return;
        const next = [...terms];
        [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
        onChange(next);
    };

    const resetDefaults = () => {
        if (confirm('Khôi phục điều khoản mặc định? Thay đổi chưa lưu sẽ mất.')) {
            onChange([...DEFAULT_TERMS]);
        }
    };

    // Drag and drop handlers
    const handleDragStart = (idx) => setDragIdx(idx);
    const handleDragOver = (e) => e.preventDefault();
    const handleDrop = (targetIdx) => {
        if (dragIdx === null || dragIdx === targetIdx) return;
        const next = [...terms];
        const [moved] = next.splice(dragIdx, 1);
        next.splice(targetIdx, 0, moved);
        onChange(next);
        setDragIdx(null);
    };

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div>
                    <h4 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>
                        📜 Điều khoản & Cam kết báo giá
                    </h4>
                    <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>
                        Các điều khoản hiển thị ở cuối báo giá gửi khách hàng. Kéo thả hoặc dùng nút ↑↓ để sắp xếp.
                    </p>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                    <button
                        onClick={resetDefaults}
                        style={{
                            padding: '6px 14px', fontSize: 12, fontWeight: 600,
                            border: '1px solid var(--border)', borderRadius: 6,
                            background: 'var(--bg-secondary)', color: 'var(--text-muted)',
                            cursor: 'pointer',
                        }}
                    >
                        ↩ Mặc định
                    </button>
                    <button
                        onClick={add}
                        style={{
                            padding: '6px 14px', fontSize: 12, fontWeight: 700,
                            border: 'none', borderRadius: 6,
                            background: 'var(--accent-primary)', color: '#fff',
                            cursor: 'pointer',
                        }}
                    >
                        + Thêm điều khoản
                    </button>
                </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {terms.map((t, idx) => (
                    <div
                        key={idx}
                        draggable
                        onDragStart={() => handleDragStart(idx)}
                        onDragOver={handleDragOver}
                        onDrop={() => handleDrop(idx)}
                        style={{
                            display: 'flex', gap: 8, alignItems: 'flex-start',
                            padding: '10px 12px', borderRadius: 8,
                            border: '1px solid var(--border)',
                            background: dragIdx === idx ? 'var(--bg-tertiary)' : 'var(--bg-primary)',
                            cursor: 'grab', transition: 'background 0.15s',
                        }}
                    >
                        {/* Drag handle + numbering */}
                        <div style={{
                            minWidth: 28, height: 28, borderRadius: 6,
                            background: 'var(--accent-primary)', color: '#fff',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 12, fontWeight: 800, flexShrink: 0, marginTop: 2,
                        }}>
                            {idx + 1}
                        </div>

                        {/* Text input */}
                        <textarea
                            value={t}
                            onChange={(e) => update(idx, e.target.value)}
                            rows={2}
                            style={{
                                flex: 1, padding: '6px 10px', border: '1px solid var(--border)',
                                borderRadius: 6, fontSize: 13, fontFamily: 'inherit',
                                resize: 'vertical', background: 'var(--bg-secondary)',
                                color: 'var(--text-primary)', lineHeight: 1.5,
                            }}
                            placeholder="Nhập nội dung điều khoản..."
                        />

                        {/* Action buttons */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flexShrink: 0 }}>
                            <button onClick={() => moveUp(idx)} disabled={idx === 0}
                                style={{
                                    width: 26, height: 22, border: '1px solid var(--border)', borderRadius: 4,
                                    background: 'var(--bg-secondary)', cursor: idx === 0 ? 'default' : 'pointer',
                                    opacity: idx === 0 ? 0.3 : 1, fontSize: 11,
                                }}>↑</button>
                            <button onClick={() => moveDown(idx)} disabled={idx >= terms.length - 1}
                                style={{
                                    width: 26, height: 22, border: '1px solid var(--border)', borderRadius: 4,
                                    background: 'var(--bg-secondary)', cursor: idx >= terms.length - 1 ? 'default' : 'pointer',
                                    opacity: idx >= terms.length - 1 ? 0.3 : 1, fontSize: 11,
                                }}>↓</button>
                            <button onClick={() => remove(idx)}
                                style={{
                                    width: 26, height: 22, border: '1px solid var(--border)', borderRadius: 4,
                                    background: terms.length <= 1 ? 'var(--bg-secondary)' : '#fee2e2',
                                    color: terms.length <= 1 ? 'var(--text-muted)' : '#dc2626',
                                    cursor: terms.length <= 1 ? 'default' : 'pointer',
                                    opacity: terms.length <= 1 ? 0.3 : 1, fontSize: 11,
                                }}>✕</button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Preview */}
            <div style={{
                marginTop: 20, padding: 16, borderRadius: 8,
                border: '1px dashed var(--border)', background: 'var(--bg-secondary)',
            }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8 }}>
                    👁 Xem trước hiển thị trên báo giá:
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.8 }}>
                    <strong>Điều khoản & Cam kết:</strong><br />
                    {terms.filter(t => t.trim()).map((t, i) => (
                        <span key={i}>• {t}<br /></span>
                    ))}
                </div>
            </div>
        </div>
    );
}
