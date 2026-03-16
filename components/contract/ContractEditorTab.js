'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { CONTRACT_VARIABLES, fillVariables, renderItemsTable, renderPaymentTermsTable } from '@/lib/contractVariables';

const RichTextEditor = dynamic(() => import('@/components/ui/RichTextEditor'), { ssr: false });

const fmt = (n) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n || 0);

export default function ContractEditorTab({ contract, quotation, customer, project, payments = [], onSave }) {
    const [templates, setTemplates] = useState([]);
    const [selectedTemplate, setSelectedTemplate] = useState('');
    const [contractBody, setContractBody] = useState(contract?.contractBody || '');
    const [selectedItems, setSelectedItems] = useState(() => {
        try { return JSON.parse(contract?.selectedItems || '[]'); } catch { return []; }
    });
    const [saving, setSaving] = useState(false);
    const [downloading, setDownloading] = useState(false);
    const [previewMode, setPreviewMode] = useState(false);
    const [editorKey, setEditorKey] = useState(0);

    // Load templates
    useEffect(() => {
        fetch(`/api/contract-templates?type=${encodeURIComponent(contract?.type || 'Thi công')}`).then(r => r.json()).then(d => {
            setTemplates(Array.isArray(d) ? d : []);
        }).catch(() => { });
    }, [contract?.type]);

    // Build items list from quotation
    const quotationItems = useMemo(() => {
        if (!quotation?.categories) return [];
        const items = [];
        quotation.categories.forEach(cat => {
            (cat.items || []).forEach(item => {
                items.push({ ...item, categoryName: cat.name, categoryId: cat.id });
            });
        });
        return items;
    }, [quotation]);

    // Group items by category
    const itemsByCategory = useMemo(() => {
        const groups = {};
        quotationItems.forEach(item => {
            if (!groups[item.categoryName]) groups[item.categoryName] = [];
            groups[item.categoryName].push(item);
        });
        return groups;
    }, [quotationItems]);

    // All selected?
    const allSelected = quotationItems.length > 0 && selectedItems.length === quotationItems.length;

    const toggleItem = (itemId) => {
        setSelectedItems(prev => prev.includes(itemId) ? prev.filter(id => id !== itemId) : [...prev, itemId]);
    };
    const toggleCategory = (catItems) => {
        const catIds = catItems.map(i => i.id);
        const allCatSelected = catIds.every(id => selectedItems.includes(id));
        setSelectedItems(prev => allCatSelected ? prev.filter(id => !catIds.includes(id)) : [...new Set([...prev, ...catIds])]);
    };
    const toggleAll = () => {
        setSelectedItems(allSelected ? [] : quotationItems.map(i => i.id));
    };

    // Apply template
    const applyTemplate = useCallback(() => {
        const tmpl = templates.find(t => t.id === selectedTemplate);
        if (!tmpl) return alert('Chọn biểu mẫu trước!');

        const filled = fillVariables(tmpl.body, {
            contract, customer, project, quotation,
            payments,
            selectedItemIds: selectedItems.length > 0 ? selectedItems : null,
        });
        setContractBody(filled);
        setEditorKey(k => k + 1);
    }, [selectedTemplate, templates, contract, customer, project, quotation, payments, selectedItems]);

    // Live preview
    const previewHtml = useMemo(() => {
        return fillVariables(contractBody, {
            contract, customer, project, quotation,
            payments,
            selectedItemIds: selectedItems.length > 0 ? selectedItems : null,
        });
    }, [contractBody, contract, customer, project, quotation, payments, selectedItems]);

    // Save
    const handleSave = async () => {
        setSaving(true);
        try {
            const res = await fetch(`/api/contracts/${contract.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contractBody,
                    selectedItems: JSON.stringify(selectedItems),
                    templateId: selectedTemplate || contract.templateId || '',
                }),
            });
            if (res.ok) {
                onSave?.(await res.json());
            } else {
                const err = await res.json().catch(() => ({}));
                alert('Lỗi lưu: ' + (err.error || 'Không rõ'));
            }
        } catch (e) { alert('Lỗi: ' + e.message); }
        setSaving(false);
    };

    // Export DOCX
    const handleExportDocx = async () => {
        setDownloading(true);
        try {
            const res = await fetch(`/api/contracts/${contract.id}/export-docx`);
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.error || 'Lỗi xuất file');
            }
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `HD-${contract.contractNumber || contract.id}.docx`;
            a.click();
            URL.revokeObjectURL(url);
        } catch (e) { alert('Lỗi: ' + e.message); }
        setDownloading(false);
    };

    return (
        <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: 16, minHeight: 600 }}>
            {/* LEFT: Setup Parameters */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {/* Step 1: Chọn biểu mẫu */}
                <div className="card">
                    <div className="card-header" style={{ padding: '10px 16px' }}><h4 style={{ margin: 0, fontSize: 13 }}>📋 Bước 1: Chọn biểu mẫu</h4></div>
                    <div className="card-body" style={{ padding: 14 }}>
                        {templates.length === 0 ? (
                            <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', padding: 12 }}>
                                Chưa có mẫu cho "{contract?.type}".
                                <br /><a href="/admin/settings" style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>→ Tạo mẫu trong Settings</a>
                            </div>
                        ) : (
                            <>
                                <select className="form-select" value={selectedTemplate} onChange={e => setSelectedTemplate(e.target.value)} style={{ fontSize: 13, marginBottom: 8 }}>
                                    <option value="">-- Chọn biểu mẫu --</option>
                                    {templates.map(t => (
                                        <option key={t.id} value={t.id}>{t.name} {t.isDefault ? '⭐' : ''}</option>
                                    ))}
                                </select>
                                <button className="btn btn-primary btn-sm" onClick={applyTemplate} disabled={!selectedTemplate} style={{ width: '100%', fontSize: 12 }}>
                                    📋 Áp mẫu & tự điền biến
                                </button>
                            </>
                        )}
                    </div>
                </div>

                {/* Step 2: Tick chọn hạng mục */}
                {quotationItems.length > 0 && (
                    <div className="card">
                        <div className="card-header" style={{ padding: '10px 16px' }}>
                            <h4 style={{ margin: 0, fontSize: 13 }}>✅ Bước 2: Chọn hạng mục</h4>
                            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{selectedItems.length}/{quotationItems.length}</span>
                        </div>
                        <div className="card-body" style={{ padding: 0, maxHeight: 300, overflow: 'auto' }}>
                            {/* Select all */}
                            <div style={{ padding: '8px 14px', borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>
                                    <input type="checkbox" checked={allSelected} onChange={toggleAll} />
                                    Chọn tất cả
                                </label>
                            </div>
                            {Object.entries(itemsByCategory).map(([catName, items]) => {
                                const catIds = items.map(i => i.id);
                                const catSelected = catIds.every(id => selectedItems.includes(id));
                                return (
                                    <div key={catName}>
                                        <div style={{ padding: '6px 14px', background: 'var(--bg-hover)', borderBottom: '1px solid var(--border)' }}>
                                            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                                                <input type="checkbox" checked={catSelected} onChange={() => toggleCategory(items)} />
                                                📁 {catName}
                                            </label>
                                        </div>
                                        {items.map(item => (
                                            <div key={item.id} style={{ padding: '4px 14px 4px 32px', borderBottom: '1px solid var(--border)', fontSize: 11 }}>
                                                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                                                    <input type="checkbox" checked={selectedItems.includes(item.id)} onChange={() => toggleItem(item.id)} />
                                                    <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</span>
                                                    <span style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{fmt(item.amount)}</span>
                                                </label>
                                            </div>
                                        ))}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Step 3: Quick info */}
                <div className="card">
                    <div className="card-header" style={{ padding: '10px 16px' }}><h4 style={{ margin: 0, fontSize: 13 }}>📊 Thông tin nhanh</h4></div>
                    <div className="card-body" style={{ padding: 14, fontSize: 12 }}>
                        <div style={{ display: 'grid', gap: 6 }}>
                            {[
                                ['Khách hàng', customer?.name || '—'],
                                ['CCCD', customer?.citizenId || '—'],
                                ['Dự án', project?.name || '—'],
                                ['Giá trị HĐ', fmt(contract?.contractValue)],
                                ['Loại HĐ', contract?.type],
                            ].map(([k, v]) => (
                                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                                    <span style={{ color: 'var(--text-muted)' }}>{k}</span>
                                    <span style={{ fontWeight: 600, textAlign: 'right' }}>{v}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Save + Export buttons */}
                <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-primary" onClick={handleSave} disabled={saving} style={{ fontSize: 13, flex: 1 }}>
                        {saving ? '⏳ Đang lưu...' : '💾 Lưu nội dung'}
                    </button>
                    <button className="btn btn-outline" onClick={handleExportDocx} disabled={downloading} style={{ fontSize: 13, flex: 1 }}>
                        {downloading ? '⏳ Đang tải...' : '📥 Tải Word'}
                    </button>
                </div>
            </div>

            {/* RIGHT: Editor / Preview */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {/* Toggle bar */}
                <div style={{ display: 'flex', gap: 0, marginBottom: 12, border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden', background: 'var(--bg-secondary)' }}>
                    <button onClick={() => setPreviewMode(false)}
                        style={{ flex: 1, padding: '8px 16px', fontWeight: 600, fontSize: 13, border: 'none', cursor: 'pointer', background: !previewMode ? 'var(--accent-primary)' : 'transparent', color: !previewMode ? '#fff' : 'var(--text-muted)', transition: 'all 0.15s' }}>
                        ✏️ Soạn thảo
                    </button>
                    <button onClick={() => setPreviewMode(true)}
                        style={{ flex: 1, padding: '8px 16px', fontWeight: 600, fontSize: 13, border: 'none', cursor: 'pointer', background: previewMode ? 'var(--accent-primary)' : 'transparent', color: previewMode ? '#fff' : 'var(--text-muted)', transition: 'all 0.15s' }}>
                        👁️ Preview A4
                    </button>
                </div>

                {previewMode ? (
                    <div style={{
                        background: '#fff', color: '#000',
                        padding: '40px 50px',
                        minHeight: 600,
                        border: '1px solid #ddd',
                        borderRadius: 4,
                        boxShadow: '0 2px 20px rgba(0,0,0,0.08)',
                        fontSize: 14,
                        lineHeight: 1.8,
                        maxWidth: 800,
                        margin: '0 auto',
                        fontFamily: "'Times New Roman', serif",
                    }}>
                        <div dangerouslySetInnerHTML={{ __html: previewHtml || '<p style="color:#999;text-align:center">Chưa có nội dung. Hãy chọn biểu mẫu và bấm "Áp mẫu".</p>' }} />
                    </div>
                ) : (
                    <RichTextEditor
                        value={contractBody}
                        onChange={setContractBody}
                        placeholder="Soạn nội dung hợp đồng tại đây... Hoặc chọn biểu mẫu ở cột trái → Áp mẫu"
                        variables={CONTRACT_VARIABLES}
                        style={{ minHeight: 600 }}
                        editorKey={editorKey}
                    />
                )}
            </div>
        </div>
    );
}
