'use client';
import { createContext, useContext, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';

export const ROLES = [
    { key: 'giam_doc',   label: 'Ban GĐ',     icon: '👑', color: '#c0392b' },
    { key: 'kinh_doanh', label: 'Kinh doanh', icon: '💼', color: '#8e44ad' },
    { key: 'ky_thuat',   label: 'Kỹ thuật',   icon: '🔧', color: '#27ae60' },
    { key: 'thiet_ke',   label: 'Thiết kế',   icon: '🎨', color: '#e67e22' },
    { key: 'ke_toan',    label: 'Hành chính', icon: '📋', color: '#2980b9' },
    { key: 'kho',        label: 'Xưởng',      icon: '🏭', color: '#16a085' },
];

const PERMISSIONS = {
    giam_doc: {
        canApprove: true,  canReject: true,  canCreateExpense: true,
        canPayExpense: true, canCompleteExpense: true, canDeleteExpense: true,
        canCollectPayment: true, canPrintReceipt: true, canViewFinance: true,
        canViewProjects: true, canViewAll: true,
        canManageContractors: true, canManageSuppliers: true,
        canReassignCustomer: true, canClaimCustomer: false, canViewAllCustomers: true,
        canCreateCheckin: true, canViewAllActivities: true,
        canManageProducts: true, canManageDrawings: true, canManageVariants: true,
        canManageQC: true, canManagePunchList: true, canManageAcceptance: true,
        canManageSettings: true, canManageHR: true, canViewReports: true,
        filterProject: null,
    },
    ke_toan: {
        canApprove: false, canReject: false, canCreateExpense: true,
        canPayExpense: true, canCompleteExpense: false, canDeleteExpense: false,
        canCollectPayment: true, canPrintReceipt: true, canViewFinance: true,
        canViewProjects: true, canViewAll: true,
        canManageContractors: false, canManageSuppliers: true,
        canReassignCustomer: false, canClaimCustomer: false, canViewAllCustomers: true,
        canCreateCheckin: true, canViewAllActivities: true,
        canManageProducts: false, canManageDrawings: false, canManageVariants: false,
        canManageQC: false, canManagePunchList: false, canManageAcceptance: true,
        canManageSettings: true, canManageHR: true, canViewReports: true,
        filterProject: null,
    },
    kinh_doanh: {
        canApprove: false, canReject: false, canCreateExpense: false,
        canPayExpense: false, canCompleteExpense: false, canDeleteExpense: false,
        canCollectPayment: false, canPrintReceipt: false, canViewFinance: false,
        canViewProjects: true, canViewAll: false,
        canManageContractors: false, canManageSuppliers: false,
        canReassignCustomer: false, canClaimCustomer: true, canViewAllCustomers: false,
        canCreateCheckin: true, canViewAllActivities: false,
        canManageProducts: false, canManageDrawings: false, canManageVariants: false,
        canManageQC: false, canManagePunchList: false, canManageAcceptance: false,
        canManageSettings: false, canManageHR: false, canViewReports: false,
        filterProject: null,
    },
    kho: {
        canApprove: false, canReject: false, canCreateExpense: false,
        canPayExpense: false, canCompleteExpense: false, canDeleteExpense: false,
        canCollectPayment: false, canPrintReceipt: false, canViewFinance: false,
        canViewProjects: true, canViewAll: false,
        canManageContractors: false, canManageSuppliers: false,
        canReassignCustomer: false, canClaimCustomer: false, canViewAllCustomers: true,
        canCreateCheckin: false, canViewAllActivities: false,
        canManageProducts: true, canManageDrawings: false, canManageVariants: false,
        canManageQC: false, canManagePunchList: false, canManageAcceptance: false,
        canManageSettings: false, canManageHR: false, canViewReports: false,
        filterProject: null,
    },
    ky_thuat: {
        canApprove: false, canReject: false, canCreateExpense: false,
        canPayExpense: false, canCompleteExpense: false, canDeleteExpense: false,
        canCollectPayment: false, canPrintReceipt: false, canViewFinance: false,
        canViewProjects: true, canViewAll: false,
        canManageContractors: false, canManageSuppliers: false,
        canReassignCustomer: false, canClaimCustomer: false, canViewAllCustomers: true,
        canCreateCheckin: false, canViewAllActivities: false,
        canManageProducts: true, canManageDrawings: true, canManageVariants: false,
        canManageQC: true, canManagePunchList: true, canManageAcceptance: true,
        canManageSettings: false, canManageHR: false, canViewReports: false,
        filterProject: null,
    },
    thiet_ke: {
        canApprove: false, canReject: false, canCreateExpense: false,
        canPayExpense: false, canCompleteExpense: false, canDeleteExpense: false,
        canCollectPayment: false, canPrintReceipt: false, canViewFinance: false,
        canViewProjects: true, canViewAll: false,
        canManageContractors: false, canManageSuppliers: false,
        canReassignCustomer: false, canClaimCustomer: false, canViewAllCustomers: true,
        canCreateCheckin: false, canViewAllActivities: false,
        canManageProducts: true, canManageDrawings: true, canManageVariants: true,
        canManageQC: false, canManagePunchList: false, canManageAcceptance: false,
        canManageSettings: false, canManageHR: false, canViewReports: false,
        filterProject: null,
    },
};

const IMPERSONATE_KEY = 'motnha_impersonate_role';

const RoleContext = createContext(null);

export function RoleProvider({ children }) {
    const { data: session } = useSession();
    const realRole = session?.user?.role || 'ky_thuat';
    const [impersonateRole, setImpersonateRoleState] = useState(null);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const stored = window.localStorage.getItem(IMPERSONATE_KEY);
        if (stored && PERMISSIONS[stored] && realRole === 'giam_doc') {
            setImpersonateRoleState(stored);
        }
    }, [realRole]);

    const setImpersonateRole = (roleKey) => {
        if (realRole !== 'giam_doc') return;
        if (!roleKey || !PERMISSIONS[roleKey]) {
            setImpersonateRoleState(null);
            if (typeof window !== 'undefined') window.localStorage.removeItem(IMPERSONATE_KEY);
            return;
        }
        setImpersonateRoleState(roleKey);
        if (typeof window !== 'undefined') window.localStorage.setItem(IMPERSONATE_KEY, roleKey);
    };

    const effectiveRole = impersonateRole || realRole;
    const permissions = PERMISSIONS[effectiveRole] || PERMISSIONS.ky_thuat;
    const roleInfo = ROLES.find(r => r.key === effectiveRole) || ROLES[4];
    const realRoleInfo = ROLES.find(r => r.key === realRole) || ROLES[4];
    const isImpersonating = !!impersonateRole;

    return (
        <RoleContext.Provider value={{
            role: effectiveRole,
            realRole,
            roleInfo,
            realRoleInfo,
            permissions,
            isImpersonating,
            canImpersonate: realRole === 'giam_doc',
            setImpersonateRole,
        }}>
            {children}
        </RoleContext.Provider>
    );
}

export function useRole() {
    const ctx = useContext(RoleContext);
    if (!ctx) return {
        role: 'ky_thuat', realRole: 'ky_thuat',
        roleInfo: ROLES[4], realRoleInfo: ROLES[4],
        permissions: PERMISSIONS.ky_thuat,
        isImpersonating: false, canImpersonate: false,
        setImpersonateRole: () => { },
    };
    return ctx;
}

export { PERMISSIONS };
