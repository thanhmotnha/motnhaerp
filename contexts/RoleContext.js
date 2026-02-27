'use client';
import { createContext, useContext, useState, useEffect } from 'react';

/*
  Hệ thống phân cấp vai trò:
  - Giám đốc: Full quyền, duyệt mọi thứ
  - Phó Giám đốc: Duyệt, xem tất cả
  - Kế toán: Tạo đề nghị chi, upload chứng từ, xem tài chính
  - Kỹ thuật: Chỉ xem phần kỹ thuật (dự án, tiến độ)
*/

export const ROLES = [
    { key: 'giam_doc', label: 'Giám đốc', icon: '👑', color: '#c0392b' },
    { key: 'pho_gd', label: 'Phó Giám đốc', icon: '🏅', color: '#e67e22' },
    { key: 'ke_toan', label: 'Kế toán', icon: '📊', color: '#2980b9' },
    { key: 'ky_thuat', label: 'Kỹ thuật', icon: '🔧', color: '#27ae60' },
];

// Permission matrix
const PERMISSIONS = {
    giam_doc: {
        canApprove: true,
        canReject: true,
        canCreateExpense: true,
        canPayExpense: true,
        canCompleteExpense: true,
        canDeleteExpense: true,
        canCollectPayment: true,
        canPrintReceipt: true,
        canViewFinance: true,
        canViewProjects: true,
        canViewAll: true,
        canManageContractors: true,
        canManageSuppliers: true,
        filterProject: null, // null = all
    },
    pho_gd: {
        canApprove: true,
        canReject: true,
        canCreateExpense: true,
        canPayExpense: true,
        canCompleteExpense: true,
        canDeleteExpense: false,
        canCollectPayment: true,
        canPrintReceipt: true,
        canViewFinance: true,
        canViewProjects: true,
        canViewAll: true,
        canManageContractors: true,
        canManageSuppliers: true,
        filterProject: null,
    },
    ke_toan: {
        canApprove: false,
        canReject: false,
        canCreateExpense: true,
        canPayExpense: true, // upload chứng từ
        canCompleteExpense: false,
        canDeleteExpense: false,
        canCollectPayment: true,
        canPrintReceipt: true,
        canViewFinance: true,
        canViewProjects: true,
        canViewAll: true,
        canManageContractors: false,
        canManageSuppliers: true,
        filterProject: null,
    },
    ky_thuat: {
        canApprove: false,
        canReject: false,
        canCreateExpense: false,
        canPayExpense: false,
        canCompleteExpense: false,
        canDeleteExpense: false,
        canCollectPayment: false,
        canPrintReceipt: false,
        canViewFinance: false,
        canViewProjects: true,
        canViewAll: false,
        canManageContractors: false,
        canManageSuppliers: false,
        filterProject: null, // in practice, set to assigned projects
    },
};

const RoleContext = createContext(null);

export function RoleProvider({ children }) {
    const [role, setRole] = useState('giam_doc');

    useEffect(() => {
        const saved = localStorage.getItem('erp_role');
        if (saved && PERMISSIONS[saved]) setRole(saved);
    }, []);

    const switchRole = (newRole) => {
        setRole(newRole);
        localStorage.setItem('erp_role', newRole);
    };

    const permissions = PERMISSIONS[role] || PERMISSIONS.giam_doc;
    const roleInfo = ROLES.find(r => r.key === role) || ROLES[0];

    return (
        <RoleContext.Provider value={{ role, roleInfo, permissions, switchRole }}>
            {children}
        </RoleContext.Provider>
    );
}

export function useRole() {
    const ctx = useContext(RoleContext);
    if (!ctx) return { role: 'giam_doc', roleInfo: ROLES[0], permissions: PERMISSIONS.giam_doc, switchRole: () => { } };
    return ctx;
}

export { PERMISSIONS };
