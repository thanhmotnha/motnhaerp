'use client';

export default function FormGroup({ label, required, children, error }) {
    return (
        <div style={{ marginBottom: 16 }}>
            {label && (
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6, color: 'var(--text-primary)' }}>
                    {label}
                    {required && <span style={{ color: '#DC2626', marginLeft: 2 }}>*</span>}
                </label>
            )}
            {children}
            {error && (
                <p style={{ margin: '4px 0 0', fontSize: 12, color: '#DC2626' }}>{error}</p>
            )}
        </div>
    );
}
