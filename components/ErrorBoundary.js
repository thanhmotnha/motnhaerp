'use client';
import { Component } from 'react';

export default class ErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, info) {
        console.error('[ErrorBoundary]', error, info);
        // Report to Sentry if available
        try {
            import('@/lib/sentry').then(({ captureError }) => captureError(error, info));
        } catch { }
    }

    render() {
        if (this.state.hasError) {
            return (
                <div style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    minHeight: 400, padding: 40, textAlign: 'center',
                }}>
                    <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
                    <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8, color: 'var(--text-primary)' }}>
                        Đã xảy ra lỗi
                    </h2>
                    <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 20, maxWidth: 400 }}>
                        Có sự cố xảy ra khi hiển thị trang này. Vui lòng thử lại hoặc liên hệ hỗ trợ.
                    </p>
                    <div style={{ display: 'flex', gap: 10 }}>
                        <button className="btn btn-primary" onClick={() => window.location.reload()}>
                            🔄 Tải lại trang
                        </button>
                        <button className="btn btn-ghost" onClick={() => this.setState({ hasError: false, error: null })}>
                            ← Thử lại
                        </button>
                    </div>
                    {process.env.NODE_ENV === 'development' && this.state.error && (
                        <details style={{ marginTop: 20, textAlign: 'left', maxWidth: 500, fontSize: 12 }}>
                            <summary style={{ cursor: 'pointer', color: 'var(--status-danger)' }}>Chi tiết lỗi</summary>
                            <pre style={{ background: 'var(--bg-secondary)', padding: 12, borderRadius: 8, overflow: 'auto', marginTop: 8, fontSize: 11 }}>
                                {this.state.error.toString()}
                                {'\n'}
                                {this.state.error.stack}
                            </pre>
                        </details>
                    )}
                </div>
            );
        }
        return this.props.children;
    }
}
