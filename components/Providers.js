'use client';
import { RoleProvider } from '@/contexts/RoleContext';

export default function Providers({ children }) {
    return <RoleProvider>{children}</RoleProvider>;
}
