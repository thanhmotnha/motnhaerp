'use client';
import { useState, useEffect, useRef } from 'react';
import { apiFetch } from '@/lib/fetchClient';
import { useToast } from '@/components/ui/Toast';

export default function HandbookTab() {
    const [handbookUrl, setHandbookUrl] = useState(null);
    const [uploading, setUploading] = useState(false);
    const fileRef = useRef();
    const toast = useToast();

    const load = async () => {
        try {
            const d = await apiFetch('/api/hr/handbook');
            if (d.url && d.configured) setHandbookUrl(d.url);
        } catch { /* silent */ }
    };
    useEffect(() => { load(); }, []);

    const handleUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!file.name.match(/\.(docx|doc)$/i)) return toast.error('Chỉ hỗ trợ file .docx hoặc .doc');
        setUploading(true);
        try {
            const formData = new FormData();
            formData.append('file', file);
            const res = await fetch('/api/hr/handbook', { method: 'POST', body: formData });
            const d = await res.json();
            if (!res.ok) throw new Error(d.error || 'Lỗi upload');
            setHandbookUrl(d.url);
            toast.success('Đã cập nhật sổ tay nhân sự');
        } catch (err) { toast.error(err.message); }
        finally { setUploading(false); if (fileRef.current) fileRef.current.value = ''; }
    };

    return (
        <div>
            <div className="card-header" style={{ marginBottom: 24 }}>
                <span className="card-title">📖 Sổ tay nhân sự</span>
                <div style={{ display: 'flex', gap: 8 }}>
                    <input ref={fileRef} type="file" accept=".docx,.doc" style={{ display: 'none' }} onChange={handleUpload} />
                    <button className="btn btn-ghost btn-sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
                        {uploading ? 'Đang tải lên...' : '⬆ Cập nhật file'}
                    </button>
                </div>
            </div>
            {handbookUrl ? (
                <div style={{ textAlign: 'center', padding: 60 }}>
                    <div style={{ fontSize: 64, marginBottom: 16 }}>📘</div>
                    <p style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Sổ tay nhân sự công ty</p>
                    <p style={{ color: 'var(--text-muted)', marginBottom: 24, fontSize: 13 }}>
                        Tài liệu nội bộ — Vui lòng đọc kỹ và tuân thủ các quy định của công ty
                    </p>
                    <a href={handbookUrl} download="SoTayNhanSu.docx" className="btn btn-primary" target="_blank" rel="noreferrer">
                        ⬇ Tải về sổ tay nhân sự
                    </a>
                </div>
            ) : (
                <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>
                    <div style={{ fontSize: 48, marginBottom: 12 }}>📂</div>
                    <p>Chưa có sổ tay nhân sự</p>
                    <p style={{ fontSize: 13 }}>Giám đốc/Kế toán có thể tải lên file Word</p>
                </div>
            )}
        </div>
    );
}
