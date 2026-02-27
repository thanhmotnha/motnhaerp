'use client';
import { useState, useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';

export default function SearchBar({ value, onChange, placeholder = 'Tìm kiếm...', debounceMs = 300 }) {
    const [internal, setInternal] = useState(value || '');
    const timer = useRef(null);

    useEffect(() => {
        setInternal(value || '');
    }, [value]);

    const handleChange = (e) => {
        const v = e.target.value;
        setInternal(v);
        clearTimeout(timer.current);
        timer.current = setTimeout(() => onChange(v), debounceMs);
    };

    const handleClear = () => {
        setInternal('');
        onChange('');
    };

    return (
        <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
            <Search size={16} style={{ position: 'absolute', left: 10, color: 'var(--text-muted)' }} />
            <input
                type="text"
                value={internal}
                onChange={handleChange}
                placeholder={placeholder}
                aria-label={placeholder}
                style={{
                    padding: '8px 32px 8px 34px', borderRadius: 8,
                    border: '1px solid var(--border)', fontSize: 14,
                    outline: 'none', width: 260, background: 'var(--bg-secondary, #f9fafb)',
                }}
            />
            {internal && (
                <button
                    onClick={handleClear}
                    aria-label="Xóa tìm kiếm"
                    style={{
                        position: 'absolute', right: 8, background: 'none',
                        border: 'none', cursor: 'pointer', padding: 2, color: 'var(--text-muted)',
                    }}
                >
                    <X size={14} />
                </button>
            )}
        </div>
    );
}
