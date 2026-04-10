'use client';
import { useState, useEffect, useRef } from 'react';
import { apiFetch } from '@/lib/fetchClient';

const FILE_TYPES = [
    { value: 'image', label: '🖼️ Ảnh render / thực tế' },
    { value: 'pdf', label: '📄 PDF (bản vẽ, hợp đồng)' },
    { value: '3d', label: '📐 File 3D (skp, max, dwg...)' },
    { value: 'other', label: '📎 Khác' },
];

const FILE_TYPE_ICON = { image: '🖼️', pdf: '📄', '3d': '📐', other: '📎' };

const SPEC_FIELDS = [
    { key: 'vanColor', label: 'Màu ván chính', placeholder: 'VD: MS 331, MS 424...' },
    { key: 'vanColorCode', label: 'Mã màu ván', placeholder: 'VD: 331, 424...' },
    { key: 'acrylic', label: 'Acrylic / mặt phủ', placeholder: 'VD: Acrylic trắng sữa, không dùng...' },
    { key: 'nep', label: 'Nẹp / chỉ trang trí', placeholder: 'VD: Nẹp nhôm V-shape bạc mờ...' },
    { key: 'handleType', label: 'Tay nắm', placeholder: 'VD: Tay nắm inox 128mm, không tay nắm...' },
    { key: 'hinge', label: 'Bản lề', placeholder: 'VD: Blum Clip Top 110°, Hettich...' },
    { key: 'rail', label: 'Ray trượt', placeholder: 'VD: Ray Hettich full extension, ray âm Blum...' },
    { key: 'accessories', label: 'Phụ kiện khác', placeholder: 'VD: Chân tủ bằng, đèn LED cảm ứng...' },
    { key: 'notes', label: 'Ghi chú công năng', placeholder: 'Yêu cầu đặc biệt, chú ý khi thi công...' },
];

export default function HoSoTab({ orderId, order }) {
    const [files, setFiles] = useState([]);
    const [spec, setSpec] = useState({});
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [savingSpec, setSavingSpec] = useState(false);
    const [uploadDesc, setUploadDesc] = useState('');
    const [uploadType, setUploadType] = useState('image');
    const fileInputRef = useRef(null);

    useEffect(() => {
        Promise.all([
            apiFetch(`/api/furniture-orders/${orderId}/files`),
            apiFetch(`/api/furniture-orders/${orderId}/construction-spec`),
        ]).then(([f, s]) => {
            setFiles(f || []);
            setSpec(s || {});
        }).finally(() => setLoading(false));
    }, [orderId]);

    const handleUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploading(true);
        try {
            const form = new FormData();
            form.append('file', file);
            form.append('type', 'documents');
            const res = await fetch('/api/upload', { method: 'POST', body: form, credentials: 'include' });
            if (!res.ok) throw new Error('Upload thất bại');
            const { url } = await res.json();

            const ext = file.name.split('.').pop().toLowerCase();
            let detectedType = uploadType;
            if (['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext)) detectedType = 'image';
            else if (ext === 'pdf') detectedType = 'pdf';
            else if (['skp', 'max', 'dwg', 'dxf', '3ds', 'fbx', 'obj'].includes(ext)) detectedType = '3d';

            const newFile = await apiFetch(`/api/furniture-orders/${orderId}/files`, {
                method: 'POST',
                body: { fileName: file.name, fileUrl: url, fileType: detectedType, description: uploadDesc },
            });
            setFiles(prev => [newFile, ...prev]);
            setUploadDesc('');
            if (fileInputRef.current) fileInputRef.current.value = '';
        } catch (err) {
            alert(err.message || 'Lỗi upload');
        }
        setUploading(false);
    };

    const deleteFile = async (fid) => {
        if (!confirm('Xóa file này?')) return;
        await apiFetch(`/api/furniture-orders/${orderId}/files/${fid}`, { method: 'DELETE' });
        setFiles(prev => prev.filter(f => f.id !== fid));
    };

    const saveSpec = async () => {
        setSavingSpec(true);
        try {
            await apiFetch(`/api/furniture-orders/${orderId}/construction-spec`, { method: 'PUT', body: spec });
            alert('Đã lưu thông số!');
        } catch (err) {
            alert(err.message || 'Lỗi lưu');
        }
        setSavingSpec(false);
    };

    const printHoSo = () => {
        const w = window.open('', '_blank');
        const imgFiles = files.filter(f => f.fileType === 'image');
        const otherFiles = files.filter(f => f.fileType !== 'image');

        const specRows = SPEC_FIELDS
            .filter(f => spec[f.key])
            .map(f => `<tr><td style="font-weight:600;padding:6px 12px;width:180px;background:#f8f8f8;border:1px solid #ddd">${f.label}</td><td style="padding:6px 12px;border:1px solid #ddd;white-space:pre-wrap">${spec[f.key]}</td></tr>`)
            .join('');

        const imgGrid = imgFiles.map(f =>
            `<div style="break-inside:avoid;margin-bottom:12px">
                <img src="${f.fileUrl}" style="max-width:100%;max-height:300px;object-fit:contain;border:1px solid #eee;border-radius:4px" />
                <div style="font-size:11px;color:#666;margin-top:4px">${f.fileName}${f.description ? ' — ' + f.description : ''}</div>
            </div>`
        ).join('');

        const fileList = otherFiles.map(f =>
            `<li><a href="${f.fileUrl}" target="_blank">${FILE_TYPE_ICON[f.fileType] || '📎'} ${f.fileName}</a>${f.description ? ' — ' + f.description : ''}</li>`
        ).join('');

        w.document.write(`<!DOCTYPE html><html><head>
            <meta charset="UTF-8">
            <title>Hồ sơ thi công — ${order.name}</title>
            <style>
                body { font-family: Arial, sans-serif; font-size: 13px; color: #222; padding: 24px; max-width: 900px; margin: 0 auto; }
                h1 { font-size: 20px; margin-bottom: 4px; }
                h2 { font-size: 15px; margin: 24px 0 10px; border-bottom: 2px solid #333; padding-bottom: 4px; }
                .meta { color: #666; font-size: 12px; margin-bottom: 20px; }
                table { border-collapse: collapse; width: 100%; margin-bottom: 16px; }
                .img-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
                ul { padding-left: 20px; }
                @media print { body { padding: 0; } }
            </style>
        </head><body>
            <h1>🪵 Hồ sơ thi công — ${order.name}</h1>
            <div class="meta">
                Mã đơn: ${order.code} &nbsp;|&nbsp;
                Khách hàng: ${order.customer?.name || '—'} &nbsp;|&nbsp;
                Dự án: ${order.project?.name || '—'} &nbsp;|&nbsp;
                Ngày in: ${new Date().toLocaleDateString('vi-VN')}
            </div>

            ${specRows ? `<h2>Thông số vật liệu & phụ kiện</h2><table>${specRows}</table>` : ''}

            ${imgFiles.length > 0 ? `<h2>Hình ảnh & thiết kế (${imgFiles.length} file)</h2><div class="img-grid">${imgGrid}</div>` : ''}

            ${otherFiles.length > 0 ? `<h2>Tài liệu đính kèm</h2><ul>${fileList}</ul>` : ''}

            <div style="margin-top:40px;border-top:1px solid #ddd;padding-top:16px;display:grid;grid-template-columns:1fr 1fr;gap:40px;text-align:center">
                <div>
                    <div style="margin-bottom:60px">Xác nhận khách hàng</div>
                    <div>Ký tên & ngày tháng</div>
                </div>
                <div>
                    <div style="margin-bottom:60px">Đại diện công ty</div>
                    <div>Ký tên & ngày tháng</div>
                </div>
            </div>
        </body></html>`);
        w.document.close();
        w.print();
    };

    if (loading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải...</div>;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Upload files */}
            <div className="card">
                <div className="card-header">
                    <span className="card-title">📁 File đính kèm (3D, PDF, ảnh render)</span>
                </div>
                <div style={{ padding: '12px 0', display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                    <div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Loại file</div>
                        <select className="form-input" style={{ width: 160 }} value={uploadType} onChange={e => setUploadType(e.target.value)}>
                            {FILE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                        </select>
                    </div>
                    <div style={{ flex: 1, minWidth: 180 }}>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Mô tả (tuỳ chọn)</div>
                        <input className="form-input" placeholder="VD: Phối cảnh phòng ngủ..." value={uploadDesc} onChange={e => setUploadDesc(e.target.value)} />
                    </div>
                    <div>
                        <input ref={fileInputRef} type="file" style={{ display: 'none' }} onChange={handleUpload}
                            accept=".jpg,.jpeg,.png,.webp,.pdf,.skp,.max,.dwg,.dxf,.3ds,.fbx,.obj,.zip,.rar,.doc,.docx" />
                        <button className="btn btn-primary" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                            {uploading ? '⏳ Đang upload...' : '+ Chọn file'}
                        </button>
                    </div>
                </div>

                {files.length === 0 ? (
                    <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Chưa có file nào</div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12, paddingTop: 8 }}>
                        {files.map(f => (
                            <div key={f.id} style={{ border: '1px solid var(--border)', borderRadius: 6, overflow: 'hidden', position: 'relative' }}>
                                {f.fileType === 'image' ? (
                                    <a href={f.fileUrl} target="_blank" rel="noreferrer">
                                        <img src={f.fileUrl} alt={f.fileName}
                                            style={{ width: '100%', height: 140, objectFit: 'cover', display: 'block' }} />
                                    </a>
                                ) : (
                                    <a href={f.fileUrl} target="_blank" rel="noreferrer"
                                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 140, background: 'var(--bg-secondary)', textDecoration: 'none', fontSize: 36 }}>
                                        {FILE_TYPE_ICON[f.fileType] || '📎'}
                                    </a>
                                )}
                                <div style={{ padding: '8px 10px' }}>
                                    <div style={{ fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.fileName}</div>
                                    {f.description && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{f.description}</div>}
                                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>{new Date(f.createdAt).toLocaleDateString('vi-VN')}</div>
                                </div>
                                <button onClick={() => deleteFile(f.id)}
                                    style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(0,0,0,0.5)', border: 'none', color: '#fff', borderRadius: 4, padding: '2px 7px', cursor: 'pointer', fontSize: 12 }}>×</button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Construction spec */}
            <div className="card">
                <div className="card-header">
                    <span className="card-title">🔧 Thông số vật liệu & phụ kiện</span>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <button className="btn btn-ghost btn-sm" onClick={printHoSo}>🖨️ In hồ sơ thi công</button>
                        <button className="btn btn-primary btn-sm" onClick={saveSpec} disabled={savingSpec}>
                            {savingSpec ? '⏳...' : '💾 Lưu'}
                        </button>
                    </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, paddingTop: 8 }}>
                    {SPEC_FIELDS.map(f => (
                        <div key={f.key} style={f.key === 'notes' || f.key === 'accessories' ? { gridColumn: '1 / -1' } : {}}>
                            <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>{f.label}</label>
                            {f.key === 'notes' || f.key === 'accessories' ? (
                                <textarea className="form-input" rows={3} placeholder={f.placeholder}
                                    value={spec[f.key] || ''} onChange={e => setSpec(s => ({ ...s, [f.key]: e.target.value }))}
                                    style={{ resize: 'vertical' }} />
                            ) : (
                                <input className="form-input" placeholder={f.placeholder}
                                    value={spec[f.key] || ''} onChange={e => setSpec(s => ({ ...s, [f.key]: e.target.value }))} />
                            )}
                        </div>
                    ))}
                </div>
            </div>

        </div>
    );
}
