'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';

export default function MaterialConfirmationPage() {
    const { token } = useParams();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [name, setName] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [done, setDone] = useState(false);

    useEffect(() => {
        fetch(`/api/public/material-confirmation/${token}`)
            .then(r => r.json())
            .then(d => {
                if (d.error) setError(d.error);
                else setData(d);
            })
            .catch(() => setError('Không thể tải thông tin'))
            .finally(() => setLoading(false));
    }, [token]);

    const handleConfirm = async () => {
        if (!name.trim()) return alert('Vui lòng nhập họ tên của bạn');
        setSubmitting(true);
        try {
            const res = await fetch(`/api/public/material-confirmation/${token}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name }),
            });
            const result = await res.json();
            if (!res.ok) { alert(result.error || 'Lỗi xác nhận'); return; }
            setDone(true);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui' }}>
            <p style={{ color: '#6b7280' }}>Đang tải...</p>
        </div>
    );

    if (error) return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui' }}>
            <div style={{ textAlign: 'center', maxWidth: 400 }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
                <h2 style={{ color: '#374151', marginBottom: 8 }}>Link không hợp lệ</h2>
                <p style={{ color: '#6b7280' }}>{error}</p>
            </div>
        </div>
    );

    if (done || data?.status === 'confirmed') return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui' }}>
            <div style={{ textAlign: 'center', maxWidth: 400 }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
                <h2 style={{ color: '#16a34a', marginBottom: 8 }}>Đã xác nhận vật liệu</h2>
                {(done ? name : data?.confirmedByName) && (
                    <p style={{ color: '#6b7280' }}>Xác nhận bởi: <strong>{done ? name : data.confirmedByName}</strong></p>
                )}
                {data?.confirmedAt && !done && (
                    <p style={{ color: '#9ca3af', fontSize: 13 }}>
                        {new Date(data.confirmedAt).toLocaleString('vi-VN')}
                    </p>
                )}
            </div>
        </div>
    );

    return (
        <div style={{ minHeight: '100vh', background: '#f9fafb', fontFamily: 'system-ui' }}>
            {/* Header */}
            <div style={{ background: '#1e3a8a', color: '#fff', padding: '16px 20px' }}>
                <div style={{ maxWidth: 600, margin: '0 auto' }}>
                    <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 4 }}>Xác nhận vật liệu nội thất</div>
                    <h1 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>{data.orderName}</h1>
                    <div style={{ fontSize: 13, opacity: 0.8, marginTop: 4 }}>Khách hàng: {data.customerName}</div>
                </div>
            </div>

            <div style={{ maxWidth: 600, margin: '24px auto', padding: '0 16px' }}>
                {/* Selection header */}
                <div style={{ background: '#fff', borderRadius: 8, border: '1px solid #e5e7eb', marginBottom: 16, overflow: 'hidden' }}>
                    <div style={{ padding: '12px 16px', borderBottom: '1px solid #f3f4f6', background: '#eff6ff' }}>
                        <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#1d4ed8' }}>
                            Vòng {data.selectionRound} — {data.title}
                        </h2>
                        <p style={{ margin: '4px 0 0', fontSize: 13, color: '#6b7280' }}>
                            Vui lòng xem danh sách vật liệu bên dưới và xác nhận nếu đồng ý.
                        </p>
                    </div>

                    {/* Items table */}
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                        <thead>
                            <tr style={{ background: '#f9fafb' }}>
                                <th style={{ padding: '8px 16px', textAlign: 'left', color: '#6b7280', fontWeight: 600, borderBottom: '1px solid #e5e7eb' }}>Loại vật liệu</th>
                                <th style={{ padding: '8px 16px', textAlign: 'left', color: '#6b7280', fontWeight: 600, borderBottom: '1px solid #e5e7eb' }}>Màu / Mã</th>
                                <th style={{ padding: '8px 16px', textAlign: 'left', color: '#6b7280', fontWeight: 600, borderBottom: '1px solid #e5e7eb' }}>Khu vực</th>
                                <th style={{ padding: '8px 16px', textAlign: 'right', color: '#6b7280', fontWeight: 600, borderBottom: '1px solid #e5e7eb' }}>SL</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(data.items || []).map((item, i) => (
                                <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                                    <td style={{ padding: '10px 16px' }}>
                                        <div style={{ fontWeight: 600 }}>{item.materialName}</div>
                                        {item.supplier && <div style={{ fontSize: 11, color: '#9ca3af' }}>{item.supplier}</div>}
                                    </td>
                                    <td style={{ padding: '10px 16px' }}>
                                        <div>{item.colorName || '—'}</div>
                                        {item.colorCode && <div style={{ fontSize: 11, color: '#9ca3af' }}>{item.colorCode}</div>}
                                    </td>
                                    <td style={{ padding: '10px 16px', color: '#6b7280' }}>{item.applicationArea || '—'}</td>
                                    <td style={{ padding: '10px 16px', textAlign: 'right' }}>{item.quantity} {item.unit}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Confirmation form */}
                <div style={{ background: '#fff', borderRadius: 8, border: '1px solid #e5e7eb', padding: '20px 16px' }}>
                    <h3 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 700, color: '#374151' }}>Xác nhận đồng ý</h3>
                    <p style={{ margin: '0 0 16px', fontSize: 13, color: '#6b7280' }}>
                        Nhập họ tên của bạn để xác nhận đã xem và đồng ý với danh sách vật liệu trên.
                    </p>
                    <input
                        type="text"
                        placeholder="Họ và tên của bạn"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        style={{
                            width: '100%', padding: '10px 12px', border: '1px solid #d1d5db',
                            borderRadius: 6, fontSize: 14, marginBottom: 12, boxSizing: 'border-box',
                        }}
                    />
                    <button
                        onClick={handleConfirm}
                        disabled={submitting || !name.trim()}
                        style={{
                            width: '100%', background: submitting || !name.trim() ? '#9ca3af' : '#16a34a',
                            color: '#fff', border: 'none', padding: '12px', borderRadius: 6,
                            fontSize: 15, fontWeight: 700, cursor: submitting || !name.trim() ? 'not-allowed' : 'pointer',
                        }}
                    >
                        {submitting ? 'Đang xác nhận...' : '✓ Tôi đồng ý với danh sách vật liệu này'}
                    </button>
                </div>
            </div>
        </div>
    );
}
