'use client';
import { useState, useEffect } from 'react';
import { useRole } from '@/contexts/RoleContext';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/Toast';
import { apiFetch } from '@/lib/fetchClient';

const ROLES = [
    { value: 'giam_doc', label: 'Giám đốc' },
    { value: 'pho_gd', label: 'Phó GĐ' },
    { value: 'ke_toan', label: 'Kế toán' },
    { value: 'quan_ly_du_an', label: 'Quản lý DA' },
    { value: 'nhan_vien', label: 'Nhân viên' },
    { value: 'ky_thuat', label: 'Kỹ thuật' },
];

const ROLE_BADGE = {
    giam_doc: 'success', pho_gd: 'info', ke_toan: 'warning',
    quan_ly_du_an: 'primary', nhan_vien: 'muted', ky_thuat: 'muted',
};

const emptyForm = { name: '', email: '', username: '', password: '', role: 'nhan_vien' };

export default function AdminUsersPage() {
    const { role } = useRole();
    const router = useRouter();
    const toast = useToast();

    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState(emptyForm);
    const [saving, setSaving] = useState(false);
    const [editId, setEditId] = useState(null);
    const [editData, setEditData] = useState({});

    useEffect(() => {
        if (role && role !== 'giam_doc') { router.replace('/'); return; }
        fetchUsers();
    }, [role]);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const data = await apiFetch('/api/admin/users');
            setUsers(data);
        } catch (e) { toast.error(e.message); }
        setLoading(false);
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        if (!form.name || !form.email || !form.password) return;
        setSaving(true);
        try {
            await apiFetch('/api/admin/users', { method: 'POST', body: form });
            toast.success('Tạo tài khoản thành công');
            setShowForm(false);
            setForm(emptyForm);
            fetchUsers();
        } catch (err) { toast.error(err.message); }
        setSaving(false);
    };

    const startEdit = (u) => {
        setEditId(u.id);
        setEditData({ name: u.name, username: u.username || '', role: u.role, active: u.active, password: '' });
    };

    const saveEdit = async (id) => {
        setSaving(true);
        try {
            const body = { name: editData.name, username: editData.username, role: editData.role, active: editData.active };
            if (editData.password) body.password = editData.password;
            await apiFetch(`/api/admin/users/${id}`, { method: 'PUT', body });
            toast.success('Đã cập nhật');
            setEditId(null);
            fetchUsers();
        } catch (err) { toast.error(err.message); }
        setSaving(false);
    };

    const handleDelete = async (id) => {
        if (!confirm('Xóa tài khoản này?')) return;
        try {
            await apiFetch(`/api/admin/users/${id}`, { method: 'DELETE' });
            toast.success('Đã xóa');
            fetchUsers();
        } catch (err) { toast.error(err.message); }
    };

    if (role && role !== 'giam_doc') return null;

    return (
        <div>
            <div className="card">
                <div className="card-header">
                    <h3>Quản lý tài khoản</h3>
                    <button className="btn btn-primary" onClick={() => setShowForm(v => !v)}>
                        {showForm ? 'Hủy' : '+ Thêm tài khoản'}
                    </button>
                </div>

                {showForm && (
                    <form onSubmit={handleCreate} style={{ padding: '16px', borderBottom: '1px solid var(--border-color)', display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                        <input className="form-input" placeholder="Họ tên *" required value={form.name}
                            onChange={e => setForm(f => ({ ...f, name: e.target.value }))} style={{ flex: '1 1 180px' }} />
                        <input className="form-input" type="email" placeholder="Email *" required value={form.email}
                            onChange={e => setForm(f => ({ ...f, email: e.target.value }))} style={{ flex: '1 1 200px' }} />
                        <input className="form-input" placeholder="Username" value={form.username}
                            onChange={e => setForm(f => ({ ...f, username: e.target.value }))} style={{ flex: '1 1 140px' }} />
                        <input className="form-input" type="password" placeholder="Mật khẩu *" required value={form.password}
                            onChange={e => setForm(f => ({ ...f, password: e.target.value }))} style={{ flex: '1 1 160px' }} />
                        <select className="form-select" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} style={{ flex: '1 1 160px' }}>
                            {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                        </select>
                        <button className="btn btn-primary" type="submit" disabled={saving}>
                            {saving ? 'Đang tạo...' : 'Tạo'}
                        </button>
                    </form>
                )}

                {loading ? (
                    <div style={{ padding: 40, textAlign: 'center' }}>Đang tải...</div>
                ) : (
                    <table className="data-table">
                        <thead><tr>
                            <th>Họ tên</th><th>Username</th><th>Email</th><th>Vai trò</th><th>Trạng thái</th><th>Ngày tạo</th><th></th>
                        </tr></thead>
                        <tbody>
                            {users.map(u => (
                                <tr key={u.id}>
                                    <td>
                                        {editId === u.id
                                            ? <input className="form-input" value={editData.name}
                                                onChange={e => setEditData(d => ({ ...d, name: e.target.value }))} style={{ width: 160 }} />
                                            : <span style={{ fontWeight: 600 }}>{u.name}</span>
                                        }
                                    </td>
                                    <td>
                                        {editId === u.id
                                            ? <input className="form-input" value={editData.username}
                                                onChange={e => setEditData(d => ({ ...d, username: e.target.value }))} style={{ width: 120 }} placeholder="username" />
                                            : <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{u.username || '—'}</span>
                                        }
                                    </td>
                                    <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>{u.email}</td>
                                    <td>
                                        {editId === u.id
                                            ? <select className="form-select" value={editData.role}
                                                onChange={e => setEditData(d => ({ ...d, role: e.target.value }))} style={{ width: 140 }}>
                                                {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                                            </select>
                                            : <span className={`badge ${ROLE_BADGE[u.role] || 'muted'}`}>
                                                {ROLES.find(r => r.value === u.role)?.label || u.role}
                                            </span>
                                        }
                                    </td>
                                    <td>
                                        {editId === u.id
                                            ? <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                                                <input type="checkbox" checked={editData.active}
                                                    onChange={e => setEditData(d => ({ ...d, active: e.target.checked }))} />
                                                Hoạt động
                                            </label>
                                            : <span className={`badge ${u.active ? 'success' : 'muted'}`}>
                                                {u.active ? 'Hoạt động' : 'Tạm khóa'}
                                            </span>
                                        }
                                    </td>
                                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                        {new Date(u.createdAt).toLocaleDateString('vi-VN')}
                                    </td>
                                    <td style={{ display: 'flex', gap: 4 }}>
                                        {editId === u.id ? (
                                            <>
                                                <input className="form-input" type="password" placeholder="Đổi mật khẩu"
                                                    value={editData.password}
                                                    onChange={e => setEditData(d => ({ ...d, password: e.target.value }))}
                                                    style={{ width: 140 }} />
                                                <button className="btn btn-primary btn-sm" onClick={() => saveEdit(u.id)} disabled={saving}>Lưu</button>
                                                <button className="btn btn-ghost btn-sm" onClick={() => setEditId(null)}>Hủy</button>
                                            </>
                                        ) : (
                                            <>
                                                <button className="btn btn-ghost btn-sm" onClick={() => startEdit(u)}>✏️</button>
                                                <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(u.id)}>🗑️</button>
                                            </>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
