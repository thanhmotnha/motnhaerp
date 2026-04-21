import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

interface Props { children: ReactNode; fallback?: ReactNode; }
interface State { hasError: boolean; error: Error | null; }

export class ErrorBoundary extends Component<Props, State> {
    state: State = { hasError: false, error: null };

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, info: ErrorInfo) {
        console.error('ErrorBoundary caught:', error, info);
    }

    render() {
        if (this.state.hasError) {
            return (
                <View style={s.container}>
                    <Text style={s.emoji}>⚠️</Text>
                    <Text style={s.title}>Đã xảy ra lỗi</Text>
                    <Text style={s.message}>{this.state.error?.message}</Text>
                    <TouchableOpacity style={s.btn} onPress={() => this.setState({ hasError: false, error: null })}>
                        <Text style={s.btnText}>Thử lại</Text>
                    </TouchableOpacity>
                </View>
            );
        }
        return this.props.children;
    }
}

const s = StyleSheet.create({
    container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, backgroundColor: '#f1f5f9' },
    emoji: { fontSize: 48, marginBottom: 16 },
    title: { fontSize: 20, fontWeight: '700', color: '#1e293b', marginBottom: 8 },
    message: { fontSize: 14, color: '#64748b', textAlign: 'center', marginBottom: 24 },
    btn: { backgroundColor: '#1a355b', borderRadius: 10, paddingHorizontal: 24, paddingVertical: 12 },
    btnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
