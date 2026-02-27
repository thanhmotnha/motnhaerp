'use client';

export default function KPICard({ icon: Icon, value, label, trend, color = '#1C3A6B' }) {
    return (
        <div className="kpi-card" style={{
            background: 'var(--bg-primary, white)', borderRadius: 12,
            padding: '20px 24px', border: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', gap: 16,
        }}>
            <div style={{
                width: 48, height: 48, borderRadius: 12,
                background: `${color}15`, display: 'flex',
                alignItems: 'center', justifyContent: 'center',
            }}>
                {Icon && <Icon size={24} color={color} />}
            </div>
            <div>
                <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)' }}>
                    {value}
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
                    {label}
                </div>
                {trend && (
                    <div style={{ fontSize: 12, color: trend > 0 ? '#16A34A' : '#DC2626', marginTop: 4 }}>
                        {trend > 0 ? '+' : ''}{trend}%
                    </div>
                )}
            </div>
        </div>
    );
}
