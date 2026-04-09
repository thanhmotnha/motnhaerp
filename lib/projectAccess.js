const ASSIGNED_PROJECT_ROLE_PREFIXES = ['giam_sat'];

export function isAssignedProjectRole(role = '') {
    const normalizedRole = String(role || '').trim().toLowerCase();
    return ASSIGNED_PROJECT_ROLE_PREFIXES.some(prefix =>
        normalizedRole === prefix || normalizedRole.startsWith(`${prefix}_`)
    );
}

export function buildAssignedProjectWhere(user) {
    if (!isAssignedProjectRole(user?.role)) return null;

    const normalizedName = user?.name?.trim();
    const normalizedEmail = user?.email?.trim().toLowerCase();
    const employeeMatchers = [];
    const directMatchers = [];

    if (normalizedName) {
        directMatchers.push(
            { manager: { equals: normalizedName, mode: 'insensitive' } },
            { supervisor: { equals: normalizedName, mode: 'insensitive' } }
        );
        employeeMatchers.push({ name: { equals: normalizedName, mode: 'insensitive' } });
    }

    if (normalizedEmail) {
        employeeMatchers.push({ email: { equals: normalizedEmail, mode: 'insensitive' } });
    }

    if (directMatchers.length === 0 && employeeMatchers.length === 0) {
        return { id: '__no_assigned_project__' };
    }

    return {
        OR: [
            ...directMatchers,
            ...(employeeMatchers.length > 0
                ? [{
                    employees: {
                        some: {
                            employee: {
                                deletedAt: null,
                                OR: employeeMatchers,
                            },
                        },
                    },
                }]
                : []),
        ],
    };
}
