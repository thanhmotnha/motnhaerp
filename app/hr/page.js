'use client';
import { useState, useEffect } from 'react';
const fmt = (n) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n);
export default function HRPage() {
    const [data, setData] = useState({ employees: [], departments: [] });
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterDept, setFilterDept] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState({ name: '', position: '', phone: '', email: '', salary: 0, departmentId: '' });
    const fetchData = async () => {
        setLoading(true);
        const p = new URLSearchParams();
        if (filterDept) p.set('departmentId', filterDept);
        const res = await fetch(`/api/employees?${p}&limit=1000`);
        const d = await res.json();
        setData({ employees: d.data || [], departments: d.departments || [] }); setLoading(false);
        if (!form.departmentId && d.departments?.length) setForm(f => ({ ...f, departmentId: d.departments[0].id }));
    };
    useEffect(() => { fetchData(); }, [filterDept]);
    const handleSubmit = async () => {
        await fetch('/api/employees', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, salary: Number(form.salary) }) });
        setShowModal(false); fetchData();
    };
    const handleDelete = async (id) => { if (!confirm('Xóa?')) return; await fetch(`/api/employees/${id}`, { method: 'DELETE' }); fetchData(); };
    const filtered = search ? data.employees.filter(e => e.name.toLowerCase().includes(search.toLowerCase())) : data.employees;
    return (
        <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 24 }}>
                {data.departments.map(d => (
                    <div key={d.id} className="card" style={{ padding: 16, cursor: 'pointer', border: filterDept === d.id ? '2px solid var(--accent-primary)' : '2px solid transparent' }} onClick={() => setFilterDept(filterDept === d.id ? '' : d.id)}>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>{d.name}</div>
                        <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--accent-primary)' }}>{d._count?.employees || 0}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>nhân viên</div>
                    </div>
                ))}
            </div>
            <div className="card">
                <div className="card-header"><h3>Nhân viên</h3><button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Thêm NV</button></div>
                <div className="filter-bar"><input type="text" className="form-input" placeholder="Tìm kiếm..." value={search} onChange={e => setSearch(e.target.value)} style={{ maxWidth: 250 }} /></div>
                {loading ? <div style={{ padding: 40, textAlign: 'center' }}>Đang tải...</div> : (
                    <table className="data-table">
                        <thead><tr><th>Mã</th><th>Họ tên</th><th>Chức vụ</th><th>Phòng ban</th><th>SĐT</th><th>Lương</th><th>TT</th><th></th></tr></thead>
                        <tbody>{filtered.map(e => (
                            <tr key={e.id}><td className="accent">{e.code}</td><td className="primary">{e.name}</td><td>{e.position}</td><td><span className="badge badge-info">{e.department?.name}</span></td><td>{e.phone}</td><td>{fmt(e.salary)}</td><td><span className={`badge ${e.status === 'Đang làm' ? 'badge-success' : 'badge-default'}`}>{e.status}</span></td><td><button className="btn btn-ghost" onClick={() => handleDelete(e.id)}>🗑️</button></td></tr>
                        ))}</tbody>
                    </table>
                )}
            </div>
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header"><h3>Thêm nhân viên</h3><button className="modal-close" onClick={() => setShowModal(false)}>×</button></div>
                        <div className="modal-body">
                            <div className="form-group"><label className="form-label">Họ tên</label><input className="form-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
                            <div className="form-row">
                                <div className="form-group"><label className="form-label">Chức vụ</label><input className="form-input" value={form.position} onChange={e => setForm({ ...form, position: e.target.value })} /></div>
                                <div className="form-group"><label className="form-label">Phòng ban</label><select className="form-select" value={form.departmentId} onChange={e => setForm({ ...form, departmentId: e.target.value })}>{data.departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</select></div>
                            </div>
                            <div className="form-row">
                                <div className="form-group"><label className="form-label">SĐT</label><input className="form-input" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
                                <div className="form-group"><label className="form-label">Lương</label><input className="form-input" type="number" value={form.salary} onChange={e => setForm({ ...form, salary: e.target.value })} /></div>
                            </div>
                        </div>
                        <div className="modal-footer"><button className="btn btn-ghost" onClick={() => setShowModal(false)}>Hủy</button><button className="btn btn-primary" onClick={handleSubmit}>Lưu</button></div>
                    </div>
                </div>
            )}
        </div>
    );
}
