'use client';

export default function FilterBar({ children }) {
    return (
        <div style={{
            display: 'flex', alignItems: 'center', gap: 12,
            flexWrap: 'wrap', marginBottom: 16,
        }}>
            {children}
        </div>
    );
}
