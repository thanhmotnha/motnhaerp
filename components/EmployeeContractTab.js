'use client';
import { useState, useEffect, useCallback } from 'react';

const CONTRACT_TYPES = ['Chính thức', 'Thử việc', 'CTV', 'Thời vụ'];
const CONTRACT_STATUSES = ['Hiệu lực', 'Hết hạn', 'Thanh lý'];

export default function EmployeeContractTab({ employeeId }) {
    const [contracts, setContracts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({
        type: 'Chính thức', startDate: '', endDate: '', salary: '', insuranceSalary: '',
        position: '', department: '', notes: '',
    });

    const load = useCallback(async () => {
        const res = await fetch(`/api/employees/${employeeId}/contracts`);
        if (res.ok) setContracts(await res.json());
        setLoading(false);
    }, [employeeId]);

    useEffect(() => { load(); }, [load]);

    const submit = async (e) => {
        e.preventDefault();
        const res = await fetch(`/api/employees/${employeeId}/contracts`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(form),
        });
        if (res.ok) {
            setShowForm(false);
            setForm({ type: 'Chính thức', startDate: '', endDate: '', salary: '', insuranceSalary: '', position: '', department: '', notes: '' });
            load();
        }
    };

    const fmt = (d) => d ? new Date(d).toLocaleDateString('vi-VN') : '—';
    const fmtMoney = (v) => v ? Number(v).toLocaleString('vi-VN') + 'đ' : '—';
    const statusColor = (s) => s === 'Hiệu lực' ? 'bg-green-100 text-green-800' : s === 'Hết hạn' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-600';

    if (loading) return <div className="p-4 text-gray-500">Đang tải...</div>;

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="font-semibold text-lg">Hợp đồng lao động ({contracts.length})</h3>
                <button onClick={() => setShowForm(!showForm)}
                    className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
                    {showForm ? 'Đóng' : '+ Thêm HĐ'}
                </button>
            </div>

            {showForm && (
                <form onSubmit={submit} className="bg-gray-50 p-4 rounded-lg grid grid-cols-2 md:grid-cols-3 gap-3">
                    <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}
                        className="border rounded-lg p-2">
                        {CONTRACT_TYPES.map(t => <option key={t}>{t}</option>)}
                    </select>
                    <input type="date" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })}
                        className="border rounded-lg p-2" placeholder="Ngày bắt đầu" required />
                    <input type="date" value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })}
                        className="border rounded-lg p-2" placeholder="Ngày kết thúc" />
                    <input type="number" value={form.salary} onChange={e => setForm({ ...form, salary: e.target.value })}
                        className="border rounded-lg p-2" placeholder="Lương" />
                    <input type="number" value={form.insuranceSalary} onChange={e => setForm({ ...form, insuranceSalary: e.target.value })}
                        className="border rounded-lg p-2" placeholder="Lương BH" />
                    <input value={form.position} onChange={e => setForm({ ...form, position: e.target.value })}
                        className="border rounded-lg p-2" placeholder="Chức vụ" />
                    <input value={form.department} onChange={e => setForm({ ...form, department: e.target.value })}
                        className="border rounded-lg p-2" placeholder="Phòng ban" />
                    <input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
                        className="border rounded-lg p-2 col-span-2" placeholder="Ghi chú" />
                    <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700">Lưu</button>
                </form>
            )}

            {contracts.length === 0 ? (
                <p className="text-gray-400 text-center py-6">Chưa có hợp đồng nào</p>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-3 py-2 text-left">Mã HĐ</th>
                                <th className="px-3 py-2 text-left">Loại</th>
                                <th className="px-3 py-2 text-left">Từ ngày</th>
                                <th className="px-3 py-2 text-left">Đến ngày</th>
                                <th className="px-3 py-2 text-right">Lương</th>
                                <th className="px-3 py-2 text-right">Lương BH</th>
                                <th className="px-3 py-2 text-left">Chức vụ</th>
                                <th className="px-3 py-2 text-center">Trạng thái</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {contracts.map(c => (
                                <tr key={c.id} className="hover:bg-gray-50">
                                    <td className="px-3 py-2 font-mono text-xs">{c.code}</td>
                                    <td className="px-3 py-2">{c.type}</td>
                                    <td className="px-3 py-2">{fmt(c.startDate)}</td>
                                    <td className="px-3 py-2">{fmt(c.endDate)}</td>
                                    <td className="px-3 py-2 text-right">{fmtMoney(c.salary)}</td>
                                    <td className="px-3 py-2 text-right">{fmtMoney(c.insuranceSalary)}</td>
                                    <td className="px-3 py-2">{c.position || '—'}</td>
                                    <td className="px-3 py-2 text-center">
                                        <span className={`px-2 py-0.5 rounded-full text-xs ${statusColor(c.status)}`}>{c.status}</span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
