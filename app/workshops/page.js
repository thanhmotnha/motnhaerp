'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRole } from '@/contexts/RoleContext';
import { apiFetch } from '@/lib/fetchClient';
import { useToast } from '@/components/ui/Toast';

export default function WorkshopsPage() {
    const { role } = useRole();
    const toast = useToast();
    const [workshops, setWorkshops] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);

    const canManage = role === 'giam_doc';

    const fetchWorkshops = useCallback(async () => {
        setLoading(true);
        try {
            const data = await apiFetch('/api/workshops');
            setWorkshops(Array.isArray(data) ? data : []);
        } catch (e) { toast.error(e.message); }
        setLoading(false);
    }, []);

    useEffect(() => { fetchWorkshops(); }, [fetchWorkshops]);

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <div>
                    <h2 style={{ margin: 0 }}>Xưởng Sản Xuất</h2>
                    <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>Quản lý 2 xưởng nội bộ</div>
                </div>
                {canManage && <button className="btn btn-primary" onClick={() => setShowCreate(true)}>+ Thêm xưởng</button>}
            </div>

            {loading ? (
                <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải...</div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
                    {workshops.map(w => (
                        <WorkshopCard key={w.id} workshop={w} canManage={canManage} onRefresh={fetchWorkshops} toast={toast} />
                    ))}
                    {workshops.length === 0 && (
                        <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', gridColumn: '1/-1' }}>
                            Chưa có xưởng nào. {canManage && 'Hãy tạo xưởng mới.'}
                        </div>
                    )}
                </div>
            )}

            {showCreate && <WorkshopModal onClose={() => setShowCreate(false)} onSaved={() => { setShowCreate(false); fetchWorkshops(); }} toast={toast} />}
        </div>
    );
}

function WorkshopCard({ workshop, canManage, onRefresh, toast }) {
    const activeBatches = workshop.batches || [];

    return (
        <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div>
                    <div style={{ fontWeight: 700, fontSize: 16 }}>{workshop.code}</div>
                    <div style={{ fontWeight: 500, fontSize: 14, marginTop: 2 }}>{workshop.name}</div>
                </div>
                <span className={`badge ${workshop.isActive ? 'success' : 'muted'}`} style={{ fontSize: 10 }}>
                    {workshop.isActive ? 'Hoạt động' : 'Tạm dừng'}
                </span>
            </div>

            <dl style={{ margin: '0 0 12px', display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '4px 12px', fontSize: 12 }}>
                {workshop.address && <><dt style={{ color: 'var(--text-muted)' }}>Địa chỉ</dt><dd style={{ margin: 0 }}>{workshop.address}</dd></>}
                {workshop.phone && <><dt style={{ color: 'var(--text-muted)' }}>Điện thoại</dt><dd style={{ margin: 0 }}>{workshop.phone}</dd></>}
                {workshop.capacity > 0 && <><dt style={{ color: 'var(--text-muted)' }}>Công suất</dt><dd style={{ margin: 0 }}>{workshop.capacity} lệnh/tháng</dd></>}
            </dl>

            <div style={{ display: 'flex', gap: 10 }}>
                <div style={{ flex: 1, background: 'var(--bg-secondary)', borderRadius: 8, padding: '8px 12px', textAlign: 'center' }}>
                    <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--status-warning)' }}>{activeBatches.length}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Lệnh đang chạy</div>
                </div>
                <div style={{ flex: 1, background: 'var(--bg-secondary)', borderRadius: 8, padding: '8px 12px', textAlign: 'center' }}>
                    <div style={{ fontSize: 18, fontWeight: 700 }}>{workshop._count?.batches || 0}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Tổng lệnh SX</div>
                </div>
            </div>

            {activeBatches.length > 0 && (
                <div style={{ marginTop: 12, fontSize: 12 }}>
                    <div style={{ color: 'var(--text-muted)', marginBottom: 4 }}>Đang sản xuất:</div>
                    {activeBatches.slice(0, 3).map(b => (
                        <div key={b.id} style={{ padding: '4px 0', borderBottom: '1px solid var(--border)', color: 'var(--text-secondary)' }}>{b.code}</div>
                    ))}
                    {activeBatches.length > 3 && <div style={{ color: 'var(--text-muted)', marginTop: 4 }}>+{activeBatches.length - 3} lệnh khác</div>}
                </div>
            )}
        </div>
    );
}

function WorkshopModal({ onClose, onSaved, toast, existing }) {
    const [form, setForm] = useState({
        code: existing?.code || '',
        name: existing?.name || '',
        address: existing?.address || '',
        phone: existing?.phone || '',
        capacity: existing?.capacity || 0,
        notes: existing?.notes || '',
    });
    const [submitting, setSubmitting] = useState(false);

    const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.code || !form.name) { toast.error('Nhập mã và tên xưởng'); return; }
        setSubmitting(true);
        try {
            await apiFetch('/api/workshops', { method: 'POST', body: JSON.stringify({ ...form, capacity: Number(form.capacity) }) });
            toast.success('Đã tạo xưởng');
            onSaved();
        } catch (e) { toast.error(e.message); }
        setSubmitting(false);
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>Thêm xưởng sản xuất</h3>
                    <button className="btn-close" onClick={onClose}>✕</button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 10 }}>
                            <div><label className="form-label">Mã xưởng *</label><input className="form-input" placeholder="X01" value={form.code} onChange={set('code')} required /></div>
                            <div><label className="form-label">Tên xưởng *</label><input className="form-input" placeholder="Xưởng Bình Dương" value={form.name} onChange={set('name')} required /></div>
                        </div>
                        <div><label className="form-label">Địa chỉ</label><input className="form-input" value={form.address} onChange={set('address')} /></div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                            <div><label className="form-label">Điện thoại</label><input className="form-input" value={form.phone} onChange={set('phone')} /></div>
                            <div><label className="form-label">Công suất (lệnh/tháng)</label><input type="number" className="form-input" min={0} value={form.capacity} onChange={set('capacity')} /></div>
                        </div>
                        <div><label className="form-label">Ghi chú</label><textarea className="form-input" rows={2} value={form.notes} onChange={set('notes')} /></div>
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn btn-secondary" onClick={onClose}>Hủy</button>
                        <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? 'Đang tạo...' : 'Tạo xưởng'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
}
