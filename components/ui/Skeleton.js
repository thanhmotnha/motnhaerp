'use client';

/**
 * Skeleton Loader components cho loading states
 */

export function SkeletonBox({ width = '100%', height = 16, radius = 6, style = {} }) {
    return (
        <div
            className="skeleton-loader"
            style={{
                width, height, borderRadius: radius,
                background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
                backgroundSize: '200% 100%',
                animation: 'skeleton-shimmer 1.5s infinite',
                ...style,
            }}
        />
    );
}

export function SkeletonText({ lines = 3, widths = [], gap = 8 }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap }}>
            {Array.from({ length: lines }).map((_, i) => (
                <SkeletonBox
                    key={i}
                    width={widths[i] || (i === lines - 1 ? '60%' : '100%')}
                    height={14}
                />
            ))}
        </div>
    );
}

export function SkeletonCard({ height = 120 }) {
    return (
        <div className="card" style={{ padding: 20, height }}>
            <SkeletonBox width="40%" height={12} style={{ marginBottom: 12 }} />
            <SkeletonBox width="60%" height={28} style={{ marginBottom: 8 }} />
            <SkeletonBox width="30%" height={12} />
        </div>
    );
}

export function SkeletonTable({ rows = 5, cols = 4 }) {
    return (
        <div className="card">
            <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border-color)' }}>
                <SkeletonBox width="30%" height={18} />
            </div>
            <div style={{ padding: 16 }}>
                {/* Header */}
                <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 12, marginBottom: 16, paddingBottom: 12, borderBottom: '1px solid var(--border-color)' }}>
                    {Array.from({ length: cols }).map((_, i) => (
                        <SkeletonBox key={i} height={12} width="80%" />
                    ))}
                </div>
                {/* Rows */}
                {Array.from({ length: rows }).map((_, r) => (
                    <div key={r} style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 12, marginBottom: 14 }}>
                        {Array.from({ length: cols }).map((_, c) => (
                            <SkeletonBox key={c} height={14} width={c === 0 ? '60%' : '90%'} />
                        ))}
                    </div>
                ))}
            </div>
        </div>
    );
}

export function SkeletonDashboard() {
    return (
        <div>
            {/* Header */}
            <SkeletonBox height={80} radius={16} style={{ marginBottom: 20 }} />
            {/* KPI row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 12 }}>
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
            </div>
            {/* KPI row 2 */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
                <SkeletonCard height={90} />
                <SkeletonCard height={90} />
                <SkeletonCard height={90} />
                <SkeletonCard height={90} />
            </div>
            {/* Tables */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <SkeletonTable rows={4} cols={3} />
                <SkeletonTable rows={4} cols={2} />
            </div>
        </div>
    );
}

// CSS keyframe injection
if (typeof document !== 'undefined') {
    const styleId = 'skeleton-styles';
    if (!document.getElementById(styleId)) {
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
            @keyframes skeleton-shimmer {
                0% { background-position: -200% 0; }
                100% { background-position: 200% 0; }
            }
        `;
        document.head.appendChild(style);
    }
}
