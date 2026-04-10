'use client';
import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';

export default function PublicAcceptancePage() {
    const { token } = useParams();
    const [cert, setCert] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [signing, setSigning] = useState(false);
    const [signed, setSigned] = useState(false);
    const [customerName, setCustomerName] = useState('');
    const [signatureMode, setSignatureMode] = useState('draw');
    const canvasRef = useRef(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const uploadRef = useRef(null);

    useEffect(() => {
        fetch(`/api/public/acceptance/${token}`)
            .then(r => r.json())
            .then(data => {
                if (data.error) setError(data.error);
                else {
                    setCert(data);
                    setCustomerName(data.customerName || '');
                    if (data.status === 'SIGNED') setSigned(true);
                }
            })
            .catch(() => setError('Không thể tải dữ liệu'))
            .finally(() => setLoading(false));
    }, [token]);

    const getPos = (e) => {
        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        return { x: (clientX - rect.left) * scaleX, y: (clientY - rect.top) * scaleY };
    };

    const startDraw = (e) => {
        setIsDrawing(true);
        const { x, y } = getPos(e);
        const ctx = canvasRef.current.getContext('2d');
        ctx.beginPath();
        ctx.moveTo(x, y);
    };
    const draw = (e) => {
        if (!isDrawing) return;
        const { x, y } = getPos(e);
        const ctx = canvasRef.current.getContext('2d');
        ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.strokeStyle = '#000';
        ctx.lineTo(x, y); ctx.stroke();
    };
    const stopDraw = () => setIsDrawing(false);
    const clearCanvas = () => canvasRef.current.getContext('2d').clearRect(0, 0, 400, 150);

    const submitSign = async () => {
        let signatureUrl;
        if (signatureMode === 'draw') {
            const canvas = canvasRef.current;
            const data = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
            if (!data.some(v => v !== 0)) return alert('Vui lòng ký tên vào ô chữ ký!');
            signatureUrl = canvas.toDataURL('image/png');
        } else {
            const file = uploadRef.current?.files?.[0];
            if (!file) return alert('Chọn ảnh chữ ký!');
            signatureUrl = await new Promise(resolve => {
                const reader = new FileReader();
                reader.onload = e => resolve(e.target.result);
                reader.readAsDataURL(file);
            });
        }

        setSigning(true);
        try {
            const res = await fetch(`/api/public/acceptance/${token}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ customerName, customerSignatureUrl: signatureUrl }),
            });
            if (!res.ok) throw new Error((await res.json()).error || 'Lỗi ký');
            setCert(prev => ({ ...prev, signedAt: new Date().toISOString(), status: 'SIGNED' }));
            setSigned(true);
        } catch (err) {
            alert(err.message);
        } finally {
            setSigning(false);
        }
    };

    if (loading) return <div style={{ padding: 40, textAlign: 'center', fontFamily: 'sans-serif' }}>Đang tải...</div>;
    if (error) return <div style={{ padding: 40, textAlign: 'center', fontFamily: 'sans-serif', color: '#ef4444' }}>❌ {error}</div>;
    if (signed) return (
        <div style={{ maxWidth: 600, margin: '60px auto', padding: 24, fontFamily: 'sans-serif', textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
            <h2 style={{ color: '#22c55e', marginBottom: 8 }}>Đã ký thành công!</h2>
            <p style={{ color: '#6b7280' }}>Biên bản nghiệm thu đã được xác nhận.</p>
            {cert?.signedAt && (
                <p style={{ fontSize: 14, color: '#9ca3af' }}>Ngày ký: {new Date(cert.signedAt).toLocaleString('vi-VN')}</p>
            )}
        </div>
    );

    const total = cert?.items?.reduce((s, i) => s + i.amount, 0) || 0;

    return (
        <div style={{ maxWidth: 720, margin: '0 auto', padding: '24px 16px', fontFamily: 'sans-serif' }}>
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
                <h2 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 4px 0' }}>BIÊN BẢN NGHIỆM THU</h2>
                <div style={{ fontSize: 14, color: '#6b7280' }}>{cert?.furnitureOrder?.name} — {cert?.code}</div>
            </div>

            <div style={{ background: '#f9fafb', borderRadius: 8, padding: 16, marginBottom: 20 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                    <thead>
                        <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                            <th style={{ textAlign: 'left', padding: '8px 4px' }}>Hạng mục</th>
                            <th style={{ textAlign: 'center', padding: '8px 4px', width: 50 }}>SL</th>
                            <th style={{ textAlign: 'center', padding: '8px 4px', width: 50 }}>ĐVT</th>
                            <th style={{ textAlign: 'right', padding: '8px 4px', width: 130 }}>Thành tiền</th>
                        </tr>
                    </thead>
                    <tbody>
                        {cert?.items?.map(item => (
                            <tr key={item.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                                <td style={{ padding: '8px 4px' }}>{item.itemName}</td>
                                <td style={{ textAlign: 'center', padding: '8px 4px' }}>{item.quantity}</td>
                                <td style={{ textAlign: 'center', padding: '8px 4px' }}>{item.unit}</td>
                                <td style={{ textAlign: 'right', padding: '8px 4px' }}>{item.amount?.toLocaleString('vi-VN')} đ</td>
                            </tr>
                        ))}
                        <tr style={{ borderTop: '2px solid #e5e7eb', fontWeight: 700 }}>
                            <td colSpan={3} style={{ padding: '10px 4px', textAlign: 'right' }}>Tổng cộng:</td>
                            <td style={{ textAlign: 'right', padding: '10px 4px' }}>{total.toLocaleString('vi-VN')} đ</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: 20 }}>
                <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Xác nhận nghiệm thu</h3>
                <div style={{ marginBottom: 16 }}>
                    <label style={{ fontSize: 13, color: '#6b7280', display: 'block', marginBottom: 4 }}>Họ tên người ký</label>
                    <input style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 14, boxSizing: 'border-box' }}
                        value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="Nhập họ tên..." />
                </div>
                <div style={{ marginBottom: 16 }}>
                    <div style={{ display: 'flex', gap: 12, marginBottom: 10 }}>
                        {['draw', 'upload'].map(mode => (
                            <label key={mode} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
                                <input type="radio" checked={signatureMode === mode} onChange={() => setSignatureMode(mode)} />
                                {mode === 'draw' ? 'Ký trực tiếp' : 'Upload ảnh chữ ký'}
                            </label>
                        ))}
                    </div>
                    {signatureMode === 'draw' ? (
                        <div>
                            <canvas ref={canvasRef} width={400} height={150}
                                style={{ border: '1px solid #d1d5db', borderRadius: 6, cursor: 'crosshair', touchAction: 'none', width: '100%', maxWidth: 400 }}
                                onMouseDown={startDraw} onMouseMove={draw} onMouseUp={stopDraw} onMouseLeave={stopDraw}
                                onTouchStart={e => { e.preventDefault(); startDraw(e); }}
                                onTouchMove={e => { e.preventDefault(); draw(e); }}
                                onTouchEnd={stopDraw} />
                            <button onClick={clearCanvas} style={{ fontSize: 12, color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer', marginTop: 4 }}>🗑 Xóa</button>
                        </div>
                    ) : (
                        <input type="file" ref={uploadRef} accept="image/*" style={{ fontSize: 14 }} />
                    )}
                </div>
                <button onClick={submitSign} disabled={signing}
                    style={{ width: '100%', padding: '12px', background: '#22c55e', color: '#fff', border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 600, cursor: 'pointer', opacity: signing ? 0.7 : 1 }}>
                    {signing ? 'Đang xử lý...' : '✅ Xác nhận và ký tên'}
                </button>
            </div>
        </div>
    );
}
