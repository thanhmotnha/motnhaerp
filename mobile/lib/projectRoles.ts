const ASSIGNED_PROJECT_ROLE_PREFIXES = ['ky_thuat', 'giam_sat'];

function normalizeRole(role?: string | null) {
    return String(role || '').trim().toLowerCase();
}

export function isAssignedProjectRole(role?: string | null) {
    const normalizedRole = normalizeRole(role);
    return ASSIGNED_PROJECT_ROLE_PREFIXES.some((prefix) =>
        normalizedRole === prefix || normalizedRole.startsWith(`${prefix}_`),
    );
}

export function getProjectRoleLabel(role?: string | null) {
    const normalizedRole = normalizeRole(role);

    if (normalizedRole.startsWith('ky_thuat_hien_truong')) {
        return 'Kỹ thuật hiện trường';
    }
    if (normalizedRole.startsWith('giam_sat_noi_that')) {
        return 'Giám sát nội thất';
    }
    if (normalizedRole.startsWith('ky_thuat')) {
        return 'Kỹ thuật';
    }
    if (normalizedRole.startsWith('giam_sat')) {
        return 'Giám sát';
    }

    return 'Nhân sự dự án';
}
