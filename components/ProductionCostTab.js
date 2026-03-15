'use client';
import { useState, useEffect, useCallback } from 'react';

const CATEGORIES = ['Vật tư', 'Nhân công', 'Gia công ngoài', 'Vận chuyển', 'Khác'];

export default function ProductionCostTab({ batchId }) {
    const [data, setData] = useState({ costs: [], summary: {}, grandTotal: 0 });
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({
        category: 'Vật tư', description: '', amount: '', quantity: '1', unit: '',
    });

    const load = useCallback(async () => {
        const res = await fetch(`/api/production-batches/${batchId}/costs`);
        if (res.ok) setData(await res.json());
        setLoading(false);
    }, [batchId]);

    useEffect(() => { load(); }, [load]);

    const submit = async (e) => {
        e.preventDefault();
        const res = await fetch(`/api/production-batches/${batchId}/costs`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(form),
        });
        if (res.ok) {
            setShowForm(false);
            setForm({ category: 'Vật tư', description: '', amount: '', quantity: '1', unit: '' });
            load();
        }
    };

    const fmtMoney = (v) => Number(v).toLocaleString('vi-VN') + 'đ';

    const catColors = {
        'Vật tư': 'bg-blue-100 text-blue-800',
        'Nhân công': 'bg-green-100 text-green-800',
        'Gia công ngoài': 'bg-purple-100 text-purple-800',
        'Vận chuyển': 'bg-orange-100 text-orange-800',
        'Khác': 'bg-gray-100 text-gray-600',
    };

    if (loading) return <div className="p-4 text-gray-500">Đang tải...</div>;

    return (
        <div className="space-y-4">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                <div className="bg-blue-50 rounded-lg p-3 text-center">
                    <div className="text-xs text-gray-500">Tổng chi phí</div>
                    <div className="text-lg font-bold text-blue-700">{fmtMoney(data.grandTotal)}</div>
                </div>
                {Object.entries(data.summary).map(([cat, total]) => (
                    <div key={cat} className="bg-gray-50 rounded-lg p-3 text-center">
                        <div className="text-xs text-gray-500">{cat}</div>
                        <div className="text-sm font-semibold">{fmtMoney(total)}</div>
                    </div>
                ))}
            </div>

            <div className="flex items-center justify-between">
                <h3 className="font-semibold">Chi tiết chi phí ({data.costs.length})</h3>
                <button onClick={() => setShowForm(!showForm)}
                    className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
                    {showForm ? 'Đóng' : '+ Thêm'}
                </button>
            </div>

            {showForm && (
                <form onSubmit={submit} className="bg-gray-50 p-4 rounded-lg grid grid-cols-2 md:grid-cols-3 gap-3">
                    <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}
                        className="border rounded-lg p-2">
                        {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                    </select>
                    <input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                        className="border rounded-lg p-2" placeholder="Mô tả" required />
                    <input type="number" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })}
                        className="border rounded-lg p-2" placeholder="Đơn giá" required />
                    <input type="number" value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })}
                        className="border rounded-lg p-2" placeholder="Số lượng" />
                    <input value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })}
                        className="border rounded-lg p-2" placeholder="Đơn vị" />
                    <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700">Lưu</button>
                </form>
            )}

            {data.costs.length === 0 ? (
                <p className="text-gray-400 text-center py-6">Chưa có chi phí nào</p>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-3 py-2 text-left">Loại</th>
                                <th className="px-3 py-2 text-left">Mô tả</th>
                                <th className="px-3 py-2 text-right">Đơn giá</th>
                                <th className="px-3 py-2 text-right">SL</th>
                                <th className="px-3 py-2 text-left">ĐVT</th>
                                <th className="px-3 py-2 text-right">Thành tiền</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {data.costs.map(c => (
                                <tr key={c.id} className="hover:bg-gray-50">
                                    <td className="px-3 py-2">
                                        <span className={`px-2 py-0.5 rounded-full text-xs ${catColors[c.category] || 'bg-gray-100'}`}>{c.category}</span>
                                    </td>
                                    <td className="px-3 py-2">{c.description || '—'}</td>
                                    <td className="px-3 py-2 text-right">{fmtMoney(c.amount)}</td>
                                    <td className="px-3 py-2 text-right">{c.quantity}</td>
                                    <td className="px-3 py-2">{c.unit || '—'}</td>
                                    <td className="px-3 py-2 text-right font-medium">{fmtMoney(c.totalAmount)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
