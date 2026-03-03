'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useRole } from '@/contexts/RoleContext';

const fmt = (n) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n || 0);
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('vi-VN') : '—';
const FINANCE_ROLES = ['giam_doc', 'pho_gd', 'ke_toan'];

const SUPPLIER_TYPES = ['Vật tư xây dựng', 'Thiết bị vệ sinh', 'Thiết bị điện', 'Nội thất', 'Sắt thép', 'Gạch ốp lát', 'Sơn', 'Nhôm kính', 'Cơ khí', 'Khác'];

export default function SupplierDetailPage() {
    const { id } = useParams();
    const router = useRouter();
    const { role } = useRole();
    const canSeeFinance = FINANCE_ROLES.includes(role);

    const [supplier, setSupplier] = useState(null);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState('info');
    const [editing, setEditing] = useState(false);
    const [form, setForm] = useState({});
    const [saving, setSaving] = useState(false);

    const fetchSupplier = async () => {
        setLoading(true);
        const res = await fetch(`/api/suppliers/${id}`);
        if (res.ok) {
            const data = await res.json();
            setSupplier(data);
            setForm({
                name: data.name, type: data.type, contact: data.contact || '',
                phone: data.phone || '', email: data.email || '', address: data.address || '',
                taxCode: data.taxCode || '', bankAccount: data.bankAccount || '',
                bankName: data.bankName || '', rating: data.rating, notes: data.notes || '',
                isBlacklisted: data.isBlacklisted, creditLimit: data.creditLimit || 0,
            });
        }
        setLoading(false);
    };

    useEffect(() => { fetchSupplier(); }, [id]);

    const handleSave = async () => {
        setSaving(true);
        await fetch(`/api/suppliers/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
        setSaving(false);
        setEditing(false);
        fetchSupplier();
    };

    // Build ledger from purchaseOrders
    const buildLedger = () => {
        if (!supplier?.purchaseOrders?.length) return { rows: [], totalDebt: 0 };
        const rows = [];
        let balance = 0;
        for (const po of supplier.purchaseOrders) {
            // Phát sinh nợ
            balance += po.totalAmount || 0;
            rows.push({
                date: po.createdAt, desc: `${po.code} — ${po.project?.name || 'Không rõ DA'}`,
                debit: po.totalAmount || 0, credit: 0, balance,
            });
            // Thanh toán
            if ((po.paidAmount || 0) > 0) {
                balance -= po.paidAmount;
                rows.push({
                    date: po.updatedAt, desc: `Thanh toán — PO ${po.code}`,
                    debit: 0, credit: po.paidAmount, balance,
                });
            }
        }
        return { rows, totalDebt: balance };
    };

    // Distinct projects from POs
    const getProjects = () => {
        if (!supplier?.purchaseOrders?.length) return [];
        const map = {};
        for (const po of supplier.purchaseOrders) {
            if (po.project && !map[po.project.id]) map[po.project.id] = po.project;
        }
        return Object.values(map);
    };

    if (loading) return <div style={{ padding: 40, textAlign: 'center' }}>Đang tải...</div>;
    if (!supplier) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--status-danger)' }}>Không tìm thấy nhà cung cấp</div>;

    const { rows: ledgerRows, totalDebt } = buildLedger();
    const projects = getProjects();
    const totalPurchase = supplier.purchaseOrders?.reduce((s, p) => s + (p.totalAmount || 0), 0) || 0;
    const totalPaid = supplier.purchaseOrders?.reduce((s, p) => s + (p.paidAmount || 0), 0) || 0;

    const iS = { padding: '6px 10px', fontSize: 13, border: '1px solid var(--border)', borderRadius: 6, background: 'var(--bg-primary)', color: 'var(--text-primary)', width: '100%' };

    return (
        <div>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 24 }}>
                <button className="btn btn-ghost" onClick={() => router.push('/partners')} style={{ marginTop: 4 }}>← Quay lại</button>
                <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                        <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>{supplier.name}</h1>
                        <span className="badge muted">{supplier.code}</span>
                        <span className="badge info">{supplier.type}</span>
                        {supplier.isBlacklisted && <span style={{ background: '#1f2937', color: '#fff', fontSize: 12, padding: '2px 8px', borderRadius: 12, fontWeight: 600 }}>🚫 Blacklist</span>}
                        <span>{'⭐'.repeat(supplier.rating)}</span>
                    </div>
                </div>
                {canSeeFinance && (
                    <div style={{ display: 'flex', gap: 12, flexShrink: 0 }}>
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Tổng mua hàng</div>
                            <div style={{ fontWeight: 700, fontSize: 15 }}>{fmt(totalPurchase)}</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Đã thanh toán</div>
                            <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--status-success)' }}>{fmt(totalPaid)}</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Còn nợ</div>
                            <div style={{ fontWeight: 700, fontSize: 15, color: totalDebt > 0 ? 'var(--status-danger)' : 'var(--text-muted)' }}>{fmt(totalDebt)}</div>
                        </div>
                        {supplier.creditLimit > 0 && (
                            <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Hạn mức</div>
                                <div style={{ fontWeight: 700, fontSize: 15, color: totalDebt > supplier.creditLimit ? 'var(--status-danger)' : 'var(--text-primary)' }}>{fmt(supplier.creditLimit)}</div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Tabs */}
            <div className="card">
                <div style={{ display: 'flex', gap: 0, borderBottom: '2px solid var(--border)', paddingLeft: 16 }}>
                    {[
                        { key: 'info', label: '📋 Thông tin' },
                        { key: 'ledger', label: '📒 Sổ công nợ' },
                        { key: 'projects', label: '🏗️ Dự án tham gia' },
                        { key: 'docs', label: '📁 Tài liệu' },
                    ].map(t => (
                        <button key={t.key} onClick={() => setTab(t.key)}
                            style={{ padding: '10px 18px', fontWeight: 600, fontSize: 13, cursor: 'pointer', border: 'none', borderBottom: tab === t.key ? '3px solid var(--accent-primary)' : '3px solid transparent', background: 'none', color: tab === t.key ? 'var(--accent-primary)' : 'var(--text-muted)', transition: '0.2s' }}>
                            {t.label}
                        </button>
                    ))}
                </div>

                {/* Tab: Thông tin */}
                {tab === 'info' && (
                    <div style={{ padding: 24 }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
                            {editing ? (
                                <div style={{ display: 'flex', gap: 8 }}>
                                    <button className="btn btn-ghost" onClick={() => setEditing(false)}>Hủy</button>
                                    <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Đang lưu...' : '💾 Lưu'}</button>
                                </div>
                            ) : (
                                <button className="btn btn-ghost" onClick={() => setEditing(true)}>✏️ Sửa</button>
                            )}
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 20 }}>
                            {[
                                { label: 'Tên NCC', key: 'name', type: 'text' },
                                { label: 'Loại', key: 'type', type: 'select', opts: SUPPLIER_TYPES },
                                { label: 'Người liên hệ', key: 'contact', type: 'text' },
                                { label: 'SĐT', key: 'phone', type: 'text' },
                                { label: 'Email', key: 'email', type: 'text' },
                                { label: 'Địa chỉ', key: 'address', type: 'text' },
                                { label: 'Mã số thuế', key: 'taxCode', type: 'text' },
                                { label: 'STK ngân hàng', key: 'bankAccount', type: 'text' },
                                { label: 'Ngân hàng', key: 'bankName', type: 'text' },
                            ].map(({ label, key, type, opts }) => (
                                <div key={key}>
                                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
                                    {editing ? (
                                        type === 'select'
                                            ? <select style={iS} value={form[key]} onChange={e => setForm({ ...form, [key]: e.target.value })}>{opts.map(o => <option key={o}>{o}</option>)}</select>
                                            : <input style={iS} value={form[key]} onChange={e => setForm({ ...form, [key]: e.target.value })} />
                                    ) : (
                                        <div style={{ fontSize: 14, fontWeight: 500, color: form[key] ? 'var(--text-primary)' : 'var(--text-muted)' }}>{form[key] || '—'}</div>
                                    )}
                                </div>
                            ))}
                            <div>
                                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Đánh giá</div>
                                {editing ? (
                                    <select style={iS} value={form.rating} onChange={e => setForm({ ...form, rating: Number(e.target.value) })}>
                                        {[1,2,3,4,5].map(n => <option key={n} value={n}>{'⭐'.repeat(n)} ({n} sao)</option>)}
                                    </select>
                                ) : <div style={{ fontSize: 16 }}>{'⭐'.repeat(form.rating)}</div>}
                            </div>
                            <div>
                                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Hạn mức tín dụng</div>
                                {editing ? (
                                    <input style={iS} type="number" min="0" value={form.creditLimit} onChange={e => setForm({ ...form, creditLimit: Number(e.target.value) })} />
                                ) : <div style={{ fontSize: 14, fontWeight: 500 }}>{form.creditLimit > 0 ? fmt(form.creditLimit) : '—'}</div>}
                            </div>
                            <div>
                                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Trạng thái</div>
                                {editing ? (
                                    <button style={{ padding: '6px 14px', borderRadius: 6, border: '1px solid var(--border)', cursor: 'pointer', background: form.isBlacklisted ? '#1f2937' : 'var(--bg-secondary)', color: form.isBlacklisted ? '#fff' : 'var(--text-primary)', fontWeight: 600, fontSize: 13 }}
                                        onClick={() => setForm({ ...form, isBlacklisted: !form.isBlacklisted })}>
                                        {form.isBlacklisted ? '🚫 Đang blacklist — nhấn để bỏ' : '✅ Hoạt động — nhấn để blacklist'}
                                    </button>
                                ) : (
                                    <span style={{ background: form.isBlacklisted ? '#1f2937' : 'rgba(16,185,129,0.1)', color: form.isBlacklisted ? '#fff' : 'var(--status-success)', padding: '3px 10px', borderRadius: 12, fontSize: 13, fontWeight: 600 }}>
                                        {form.isBlacklisted ? '🚫 Blacklist' : '✅ Hoạt động'}
                                    </span>
                                )}
                            </div>
                        </div>
                        <div style={{ marginTop: 20 }}>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Ghi chú</div>
                            {editing ? (
                                <textarea style={{ ...iS, resize: 'vertical' }} rows={3} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
                            ) : <div style={{ fontSize: 14, color: form.notes ? 'var(--text-primary)' : 'var(--text-muted)', whiteSpace: 'pre-wrap' }}>{form.notes || '—'}</div>}
                        </div>
                    </div>
                )}

                {/* Tab: Sổ công nợ */}
                {tab === 'ledger' && (
                    <div style={{ overflowX: 'auto' }}>
                        {ledgerRows.length === 0 ? (
                            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Chưa có giao dịch nào</div>
                        ) : (
                            <table className="data-table" style={{ margin: 0 }}>
                                <thead><tr>
                                    <th>Ngày</th><th>Diễn giải</th>
                                    <th style={{ textAlign: 'right' }}>+Phát sinh</th>
                                    <th style={{ textAlign: 'right' }}>-Thanh toán</th>
                                    <th style={{ textAlign: 'right' }}>Tồn nợ</th>
                                </tr></thead>
                                <tbody>
                                    {ledgerRows.map((row, i) => (
                                        <tr key={i}>
                                            <td style={{ fontSize: 12, whiteSpace: 'nowrap' }}>{fmtDate(row.date)}</td>
                                            <td style={{ fontSize: 13 }}>{row.desc}</td>
                                            <td style={{ textAlign: 'right', fontSize: 12, color: row.debit > 0 ? 'var(--status-danger)' : 'var(--text-muted)' }}>{row.debit > 0 ? fmt(row.debit) : '—'}</td>
                                            <td style={{ textAlign: 'right', fontSize: 12, color: row.credit > 0 ? 'var(--status-success)' : 'var(--text-muted)' }}>{row.credit > 0 ? fmt(row.credit) : '—'}</td>
                                            <td style={{ textAlign: 'right', fontSize: 12, fontWeight: 600, color: row.balance > 0 ? 'var(--status-danger)' : 'var(--text-muted)' }}>{fmt(row.balance)}</td>
                                        </tr>
                                    ))}
                                    <tr style={{ background: 'var(--bg-secondary)', fontWeight: 700 }}>
                                        <td colSpan={2} style={{ textAlign: 'right', fontSize: 13 }}>Tổng tồn nợ</td>
                                        <td style={{ textAlign: 'right', fontSize: 13, color: 'var(--status-danger)' }}>{fmt(totalPurchase)}</td>
                                        <td style={{ textAlign: 'right', fontSize: 13, color: 'var(--status-success)' }}>{fmt(totalPaid)}</td>
                                        <td style={{ textAlign: 'right', fontSize: 13, color: totalDebt > 0 ? 'var(--status-danger)' : 'var(--text-muted)' }}>{fmt(totalDebt)}</td>
                                    </tr>
                                </tbody>
                            </table>
                        )}
                    </div>
                )}

                {/* Tab: Dự án tham gia */}
                {tab === 'projects' && (
                    <div style={{ overflowX: 'auto' }}>
                        {projects.length === 0 ? (
                            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Chưa tham gia dự án nào</div>
                        ) : (
                            <table className="data-table" style={{ margin: 0 }}>
                                <thead><tr><th>Mã DA</th><th>Tên dự án</th><th>Trạng thái</th><th></th></tr></thead>
                                <tbody>{projects.map(p => (
                                    <tr key={p.id}>
                                        <td className="accent">{p.code}</td>
                                        <td className="primary">{p.name}</td>
                                        <td><span className="badge info">{p.status}</span></td>
                                        <td><button className="btn btn-ghost btn-sm" onClick={() => router.push(`/projects/${p.id}`)}>Xem →</button></td>
                                    </tr>
                                ))}</tbody>
                            </table>
                        )}
                    </div>
                )}

                {/* Tab: Tài liệu */}
                {tab === 'docs' && (
                    <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
                        <div style={{ fontSize: 40, marginBottom: 12 }}>📁</div>
                        <div style={{ fontWeight: 600, marginBottom: 6 }}>Tài liệu đính kèm</div>
                        <div style={{ fontSize: 13 }}>Phase B: Lưu file báo giá, hợp đồng nguyên tắc và tài liệu liên quan</div>
                    </div>
                )}
            </div>
        </div>
    );
}
