'use client';
import { useRef, useState, useEffect, useCallback } from 'react';

export default function SignaturePad({ onSave, width = 400, height = 200, style = {} }) {
    const canvasRef = useRef(null);
    const [drawing, setDrawing] = useState(false);
    const [hasSignature, setHasSignature] = useState(false);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = '#1a1a2e';
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
    }, []);

    const getPos = (e) => {
        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        if (e.touches) {
            return { x: (e.touches[0].clientX - rect.left) * scaleX, y: (e.touches[0].clientY - rect.top) * scaleY };
        }
        return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
    };

    const startDraw = (e) => {
        e.preventDefault();
        setDrawing(true);
        setHasSignature(true);
        const ctx = canvasRef.current.getContext('2d');
        const pos = getPos(e);
        ctx.beginPath();
        ctx.moveTo(pos.x, pos.y);
    };

    const draw = (e) => {
        if (!drawing) return;
        e.preventDefault();
        const ctx = canvasRef.current.getContext('2d');
        const pos = getPos(e);
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
    };

    const endDraw = () => setDrawing(false);

    const clear = () => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        setHasSignature(false);
    };

    const save = useCallback(() => {
        if (!hasSignature) return;
        const dataUrl = canvasRef.current.toDataURL('image/png');
        onSave?.(dataUrl);
    }, [hasSignature, onSave]);

    return (
        <div style={{ ...style }}>
            <div style={{
                border: '2px dashed #cbd5e1', borderRadius: 8, overflow: 'hidden',
                background: '#fff', position: 'relative', touchAction: 'none',
            }}>
                <canvas
                    ref={canvasRef}
                    width={width}
                    height={height}
                    style={{ width: '100%', height: 'auto', display: 'block', cursor: 'crosshair' }}
                    onMouseDown={startDraw}
                    onMouseMove={draw}
                    onMouseUp={endDraw}
                    onMouseLeave={endDraw}
                    onTouchStart={startDraw}
                    onTouchMove={draw}
                    onTouchEnd={endDraw}
                />
                {!hasSignature && (
                    <div style={{
                        position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        pointerEvents: 'none', color: '#94a3b8', fontSize: 14, fontStyle: 'italic',
                    }}>
                        ✍️ Vẽ chữ ký tại đây
                    </div>
                )}
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 10, justifyContent: 'flex-end' }}>
                <button type="button" onClick={clear}
                    style={{ padding: '8px 16px', border: '1px solid #cbd5e1', borderRadius: 6, background: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                    🗑 Xóa & vẽ lại
                </button>
                <button type="button" onClick={save} disabled={!hasSignature}
                    style={{
                        padding: '8px 24px', border: 'none', borderRadius: 6, cursor: hasSignature ? 'pointer' : 'not-allowed',
                        background: hasSignature ? '#16a34a' : '#e2e8f0', color: hasSignature ? '#fff' : '#94a3b8',
                        fontSize: 13, fontWeight: 800,
                    }}>
                    ✅ Xác nhận chữ ký
                </button>
            </div>
        </div>
    );
}
