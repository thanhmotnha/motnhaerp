'use client';
import { useState } from 'react';
import { QUOTATION_TYPES } from '@/lib/quotation-constants';

const DEFAULT_TERMS = [
    'Báo giá có hiệu lực 30 ngày kể từ ngày lập.',
    'Thanh toán theo tiến độ giai đoạn được thỏa thuận trong hợp đồng.',
    'Giá trên đã bao gồm nhân công, vật tư theo bảng chi tiết.',
    'Một Nhà cam kết thi công đúng tiến độ, đúng chất lượng.',
    'Mọi thay đổi phát sinh sẽ được thông báo và xác nhận trước khi thực hiện.',
];

/** value: { [type]: string[] }, onChange: (obj) => void */
export default function QuotationTermsTab({ value, onChange }) {
    const allTerms = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
    const [activeType, setActiveType] = useState(QUOTATION_TYPES[0]);
    const [dragIdx, setDragIdx] = useState(null);

    const getTerms = (type) => {
        const arr = allTerms[type];
        return Array.isArray(arr) && arr.length > 0 ? arr : [...DEFAULT_TERMS];
    };

    const terms = getTerms(activeType);

    const setTerms = (newTerms) => {
        onChange({ ...allTerms, [activeType]: newTerms });
    };

    const update = (idx, text) => { const next = [...terms]; next[idx] = text; setTerms(next); };
    const remove = (idx) => { if (terms.length <= 1) return; setTerms(terms.filter((_, i) => i !== idx)); };
    const add = () => setTerms([...terms, '']);
    const moveUp = (idx) => { if (idx === 0) return; const n = [...terms]; [n[idx - 1], n[idx]] = [n[idx], n[idx - 1]]; setTerms(n); };
    const moveDown = (idx) => { if (idx >= terms.length - 1) return; const n = [...terms]; [n[idx], n[idx + 1]] = [n[idx + 1], n[idx]]; setTerms(n); };
    const resetDefaults = () => { if (confirm('Khôi phục điều khoản mặc định cho ' + activeType + '?')) setTerms([...DEFAULT_TERMS]); };

    const handleDragStart = (idx) => setDragIdx(idx);
    const handleDragOver = (e) => e.preventDefault();
    const handleDrop = (targetIdx) => {
        if (dragIdx === null || dragIdx === targetIdx) return;
        const next = [...terms]; const [moved] = next.splice(dragIdx, 1); next.splice(targetIdx, 0, moved);
        setTerms(next); setDragIdx(null);
    };

    // Check which types have custom terms configured
    const hasCustom = (type) => Array.isArray(allTerms[type]) && allTerms[type].length > 0;

    return (
        <div>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div>
                    <h4 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>
                        📜 Điều khoản & Cam kết theo loại báo giá
                    </h4>
                    <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>
                        Mỗi loại báo giá có bộ điều khoản riêng. Chọn loại để chỉnh sửa.
                    </p>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={resetDefaults} style={{
                        padding: '6px 14px', fontSize: 12, fontWeight: 600,
                        border: '1px solid var(--border)', borderRadius: 6,
                        background: 'var(--bg-secondary)', color: 'var(--text-muted)', cursor: 'pointer',
                    }}>↩ Mặc định</button>
                    <button onClick={add} style={{
                        padding: '6px 14px', fontSize: 12, fontWeight: 700,
                        border: 'none', borderRadius: 6,
                        background: 'var(--accent-primary)', color: '#fff', cursor: 'pointer',
                    }}>+ Thêm điều khoản</button>
                </div>
            </div>

            {/* Type tabs */}
            <div style={{
                display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16,
                padding: '8px 0', borderBottom: '1px solid var(--border)',
            }}>
                {QUOTATION_TYPES.map(type => (
                    <button
                        key={type}
                        onClick={() => setActiveType(type)}
                        style={{
                            padding: '6px 14px', fontSize: 12, fontWeight: activeType === type ? 700 : 500,
                            border: activeType === type ? '2px solid var(--accent-primary)' : '1px solid var(--border)',
                            borderRadius: 20,
                            background: activeType === type ? 'var(--accent-primary)' : 'var(--bg-secondary)',
                            color: activeType === type ? '#fff' : 'var(--text-primary)',
                            cursor: 'pointer', transition: 'all 0.15s',
                            position: 'relative',
                        }}
                    >
                        {type}
                        {hasCustom(type) && (
                            <span style={{
                                position: 'absolute', top: -2, right: -2, width: 8, height: 8,
                                borderRadius: '50%', background: '#22c55e', border: '2px solid var(--bg-primary)',
                            }} />
                        )}
                    </button>
                ))}
            </div>

            {/* Terms editor */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {terms.map((t, idx) => (
                    <div
                        key={idx} draggable
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
                        <div style={{
                            minWidth: 28, height: 28, borderRadius: 6,
                            background: 'var(--accent-primary)', color: '#fff',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 12, fontWeight: 800, flexShrink: 0, marginTop: 2,
                        }}>{idx + 1}</div>

                        <textarea
                            value={t} onChange={(e) => update(idx, e.target.value)} rows={2}
                            style={{
                                flex: 1, padding: '6px 10px', border: '1px solid var(--border)',
                                borderRadius: 6, fontSize: 13, fontFamily: 'inherit',
                                resize: 'vertical', background: 'var(--bg-secondary)',
                                color: 'var(--text-primary)', lineHeight: 1.5,
                            }}
                            placeholder="Nhập nội dung điều khoản..."
                        />

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
                    👁 Xem trước — {activeType}:
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
