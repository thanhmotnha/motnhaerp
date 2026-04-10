'use client';
import { useState, useEffect, useRef } from 'react';

export default function CncFilesTab({ orderId, order, onRefresh }) {
    const [files, setFiles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [pieceCount, setPieceCount] = useState(0);
    const [notes, setNotes] = useState('');
    const fileRef = useRef(null);

    const fetchFiles = async () => {
        setLoading(true);
        const res = await fetch(`/api/furniture-orders/${orderId}/cnc-files`);
        setFiles(await res.json());
        setLoading(false);
    };

    useEffect(() => { fetchFiles(); }, [orderId]);

    const uploadFile = async () => {
        const file = fileRef.current?.files?.[0];
        if (!file) return alert('Chọn file trước!');
        setUploading(true);
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('pieceCount', pieceCount);
            formData.append('notes', notes);
            const res = await fetch(`/api/furniture-orders/${orderId}/cnc-files`, { method: 'POST', body: formData });
            if (!res.ok) throw new Error((await res.json()).error || 'Lỗi upload');
            fileRef.current.value = '';
            setPieceCount(0);
            setNotes('');
            await fetchFiles();
        } catch (err) {
            alert(err.message);
        } finally {
            setUploading(false);
        }
    };

    const deleteFile = async (fid) => {
        if (!confirm('Xóa file này?')) return;
        await fetch(`/api/furniture-orders/${orderId}/cnc-files/${fid}`, { method: 'DELETE' });
        await fetchFiles();
    };

    const confirmCnc = async () => {
        if (!confirm('Xác nhận CNC hoàn tất? Trạng thái chuyển sang "Có CNC".')) return;
        const res = await fetch(`/api/furniture-orders/${orderId}/confirm-cnc`, { method: 'POST' });
        if (!res.ok) { const d = await res.json(); return alert(d.error || 'Lỗi'); }
        onRefresh();
    };

    const totalPieces = files.reduce((s, f) => s + f.pieceCount, 0);
    const canConfirm = order.status === 'confirmed' && files.length > 0;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="card">
                <div className="card-header">
                    <span className="card-title">Upload File CNC</span>
                    {canConfirm && (
                        <button className="btn btn-primary btn-sm" onClick={confirmCnc}>✅ Xác nhận CNC hoàn tất</button>
                    )}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 10, alignItems: 'end' }}>
                    <div>
                        <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>File DXF/PDF</label>
                        <input type="file" ref={fileRef} accept=".dxf,.pdf,.dwg" className="form-input" />
                    </div>
                    <div>
                        <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>Số tấm</label>
                        <input type="number" className="form-input" style={{ width: 80 }} value={pieceCount}
                            onChange={e => setPieceCount(Number(e.target.value))} min={0} />
                    </div>
                    <button className="btn btn-primary" onClick={uploadFile} disabled={uploading}>
                        {uploading ? 'Đang tải...' : '⬆ Upload'}
                    </button>
                </div>
                <input className="form-input" style={{ marginTop: 8 }} placeholder="Ghi chú..."
                    value={notes} onChange={e => setNotes(e.target.value)} />
            </div>

            <div className="card">
                <div className="card-header">
                    <span className="card-title">Danh sách file CNC</span>
                    <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Tổng: <strong>{totalPieces}</strong> tấm</span>
                </div>
                {loading ? (
                    <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải...</div>
                ) : files.length === 0 ? (
                    <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>Chưa có file nào</div>
                ) : (
                    <div className="table-container">
                        <table className="data-table" style={{ fontSize: 13 }}>
                            <thead><tr><th>Tên file</th><th>Số tấm</th><th>Ghi chú</th><th>Ngày upload</th><th></th></tr></thead>
                            <tbody>
                                {files.map(f => (
                                    <tr key={f.id}>
                                        <td>
                                            <a href={f.fileUrl} target="_blank" rel="noopener noreferrer"
                                                style={{ color: 'var(--status-info)' }}>📄 {f.fileName}</a>
                                        </td>
                                        <td style={{ fontWeight: 600 }}>{f.pieceCount}</td>
                                        <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{f.notes || '—'}</td>
                                        <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                            {new Date(f.uploadedAt).toLocaleDateString('vi-VN')}
                                        </td>
                                        <td>
                                            <button className="btn btn-ghost btn-sm" style={{ color: 'var(--status-danger)' }}
                                                onClick={() => deleteFile(f.id)}>🗑</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
