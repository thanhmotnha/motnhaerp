'use client';

import { finances, projects, products, formatCurrency } from '@/data/mockData';

export default function ReportsPage() {
    const yearRevenue = finances.revenue.reduce((s, r) => s + r.value, 0);
    const yearExpense = finances.expenses.reduce((s, e) => s + e.value, 0);
    const yearProfit = yearRevenue - yearExpense;
    const totalBudget = projects.reduce((s, p) => s + p.budget, 0);
    const totalSpent = projects.reduce((s, p) => s + p.spent, 0);
    const maxRevenue = Math.max(...finances.revenue.map(r => r.value));
    const inventoryValue = products.reduce((s, p) => s + (p.salePrice * p.stock), 0);
    const lowStockCount = products.filter(p => p.stock <= p.minStock).length;

    return (
        <>
            <div className="page-header">
                <div className="page-header-left">
                    <h1>📈 Báo cáo & Thống kê</h1>
                    <p>Tổng hợp dữ liệu kinh doanh, dự án và tài chính</p>
                </div>
                <button className="btn btn-secondary">📥 Xuất báo cáo</button>
            </div>

            {/* Report Cards */}
            <div className="report-grid" style={{ marginBottom: 28 }}>
                {/* Revenue Report */}
                <div className="report-card">
                    <div className="report-icon">💰</div>
                    <div className="report-title">Báo cáo Doanh thu</div>
                    <div className="report-desc">Tổng hợp doanh thu theo tháng, quý, năm. So sánh với chi phí và tính lợi nhuận.</div>
                    <div className="report-metrics">
                        <div className="report-metric">
                            <span className="rm-value" style={{ color: 'var(--status-success)' }}>{formatCurrency(yearRevenue)}</span>
                            <span className="rm-label">Doanh thu 2025</span>
                        </div>
                        <div className="report-metric">
                            <span className="rm-value" style={{ color: 'var(--status-danger)' }}>{formatCurrency(yearExpense)}</span>
                            <span className="rm-label">Chi phí 2025</span>
                        </div>
                        <div className="report-metric">
                            <span className="rm-value" style={{ color: 'var(--accent-primary-hover)' }}>{formatCurrency(yearProfit)}</span>
                            <span className="rm-label">Lợi nhuận ròng</span>
                        </div>
                    </div>
                </div>

                {/* Project Report */}
                <div className="report-card">
                    <div className="report-icon">🏗️</div>
                    <div className="report-title">Báo cáo Dự án</div>
                    <div className="report-desc">Tiến độ tổng thể các dự án, tỷ lệ giải ngân và hiệu suất quản lý.</div>
                    <div className="report-metrics">
                        <div className="report-metric">
                            <span className="rm-value">{projects.length}</span>
                            <span className="rm-label">Tổng dự án</span>
                        </div>
                        <div className="report-metric">
                            <span className="rm-value">{formatCurrency(totalBudget)}</span>
                            <span className="rm-label">Tổng ngân sách</span>
                        </div>
                        <div className="report-metric">
                            <span className="rm-value">{Math.round((totalSpent / totalBudget) * 100)}%</span>
                            <span className="rm-label">Đã giải ngân</span>
                        </div>
                    </div>
                </div>

                {/* Inventory Report */}
                <div className="report-card">
                    <div className="report-icon">📦</div>
                    <div className="report-title">Báo cáo Tồn kho</div>
                    <div className="report-desc">Giá trị tồn kho, cảnh báo hết hàng và phân tích nhập xuất.</div>
                    <div className="report-metrics">
                        <div className="report-metric">
                            <span className="rm-value">{formatCurrency(inventoryValue)}</span>
                            <span className="rm-label">Giá trị tồn kho</span>
                        </div>
                        <div className="report-metric">
                            <span className="rm-value">{products.length}</span>
                            <span className="rm-label">Mặt hàng</span>
                        </div>
                        <div className="report-metric">
                            <span className="rm-value" style={{ color: lowStockCount > 0 ? 'var(--status-warning)' : 'var(--status-success)' }}>
                                {lowStockCount}
                            </span>
                            <span className="rm-label">Sắp hết hàng</span>
                        </div>
                    </div>
                </div>

                {/* Debt Report */}
                <div className="report-card">
                    <div className="report-icon">📊</div>
                    <div className="report-title">Báo cáo Công nợ</div>
                    <div className="report-desc">Tình trạng công nợ phải thu, phải trả và cân đối tài chính.</div>
                    <div className="report-metrics">
                        <div className="report-metric">
                            <span className="rm-value" style={{ color: 'var(--status-info)' }}>{formatCurrency(finances.receivables)}</span>
                            <span className="rm-label">Phải thu</span>
                        </div>
                        <div className="report-metric">
                            <span className="rm-value" style={{ color: 'var(--status-warning)' }}>{formatCurrency(finances.payables)}</span>
                            <span className="rm-label">Phải trả</span>
                        </div>
                        <div className="report-metric">
                            <span className="rm-value" style={{ color: 'var(--status-success)' }}>{formatCurrency(finances.receivables - finances.payables)}</span>
                            <span className="rm-label">Cân đối</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Monthly Revenue Detail */}
            <div className="card">
                <div className="card-header">
                    <span className="card-title">📊 Chi tiết Doanh thu - Chi phí theo tháng (2025)</span>
                </div>
                <div className="chart-bar-container" style={{ height: 220 }}>
                    {finances.revenue.map((item, i) => (
                        <div className="chart-bar-group" key={item.month}>
                            <div className="chart-bar-wrapper">
                                <div className="chart-bar revenue" style={{ height: `${(item.value / maxRevenue) * 100}%` }}
                                    title={`Thu: ${formatCurrency(item.value)}`} />
                                <div className="chart-bar expense" style={{ height: `${(finances.expenses[i].value / maxRevenue) * 100}%` }}
                                    title={`Chi: ${formatCurrency(finances.expenses[i].value)}`} />
                            </div>
                            <span className="chart-bar-label">{item.month}</span>
                        </div>
                    ))}
                </div>
                <div style={{ display: 'flex', justifyContent: 'center', gap: 32, marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border-light)' }}>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ width: 10, height: 10, borderRadius: 3, background: 'var(--accent-primary)', display: 'inline-block' }}></span>
                        Doanh thu
                    </span>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ width: 10, height: 10, borderRadius: 3, background: 'rgba(99,102,241,0.3)', display: 'inline-block' }}></span>
                        Chi phí
                    </span>
                </div>
            </div>

            {/* Profit by Project */}
            <div className="card" style={{ marginTop: 20 }}>
                <div className="card-header">
                    <span className="card-title">🏗️ Lợi nhuận theo Dự án</span>
                </div>
                <div className="table-container">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Mã DA</th>
                                <th>Tên dự án</th>
                                <th>Loại</th>
                                <th>Ngân sách</th>
                                <th>Đã chi</th>
                                <th>Còn lại</th>
                                <th>Tỷ lệ</th>
                                <th>Trạng thái</th>
                            </tr>
                        </thead>
                        <tbody>
                            {projects.map(p => {
                                const remaining = p.budget - p.spent;
                                const ratio = (p.spent / p.budget) * 100;
                                return (
                                    <tr key={p.id}>
                                        <td className="accent">{p.id}</td>
                                        <td className="primary">{p.name.length > 30 ? p.name.substring(0, 30) + '...' : p.name}</td>
                                        <td>{p.type}</td>
                                        <td className="amount">{formatCurrency(p.budget)}</td>
                                        <td className="amount">{formatCurrency(p.spent)}</td>
                                        <td className="amount" style={{ color: remaining >= 0 ? 'var(--status-success)' : 'var(--status-danger)' }}>
                                            {formatCurrency(remaining)}
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                <div className="progress-bar" style={{ width: 60 }}>
                                                    <div className={`progress-fill ${ratio > 90 ? 'warning' : ''}`} style={{ width: `${Math.min(ratio, 100)}%` }} />
                                                </div>
                                                <span style={{ fontSize: 12, color: ratio > 90 ? 'var(--status-warning)' : 'var(--text-muted)' }}>{ratio.toFixed(0)}%</span>
                                            </div>
                                        </td>
                                        <td><span className={`badge ${p.status === 'Bàn giao' ? 'success' : p.status === 'Thi công' ? 'info' : 'muted'}`}>{p.status}</span></td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </>
    );
}
