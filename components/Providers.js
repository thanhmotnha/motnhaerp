'use client';

import { SessionProvider } from 'next-auth/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RoleProvider } from '@/contexts/RoleContext';
import { ToastProvider } from '@/components/ui/Toast';
import { useState } from 'react';

export default function Providers({ children }) {
    const [queryClient] = useState(() => new QueryClient({
        defaultOptions: {
            queries: {
                staleTime: 30 * 1000,
                retry: 1,
            },
        },
    }));

    return (
        <SessionProvider>
            <QueryClientProvider client={queryClient}>
                <RoleProvider>
                    <ToastProvider>
                        {children}
                    </ToastProvider>
                </RoleProvider>
            </QueryClientProvider>
        </SessionProvider>
    );
}
