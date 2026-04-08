/**
 * Role constants & helpers for RBAC
 * Used by apiHandler.js (options.roles) and frontend UI gating.
 *
 * Single source of truth — keep in sync with UsersTab.js role list.
 */

// ── Role constants ──
export const ROLES = {
  GIAM_DOC: 'giam_doc',
  KE_TOAN: 'ke_toan',
  KINH_DOANH: 'kinh_doanh',
  KHO: 'kho',
  KY_THUAT: 'ky_thuat',
};

// ── Preset groups (used in withAuth options.roles) ──
export const ROLE_GROUPS = {
  /** Chỉ Giám đốc — xóa master data, quản lý users */
  MANAGERS: [ROLES.GIAM_DOC],

  /** Giám đốc + Kế toán — financial routes */
  FINANCE: [ROLES.GIAM_DOC, ROLES.KE_TOAN],

  /** Tất cả roles có quyền mua sắm/kho */
  PURCHASING: [ROLES.GIAM_DOC, ROLES.KE_TOAN, ROLES.KINH_DOANH, ROLES.KHO, ROLES.KY_THUAT],

  /** All authenticated roles */
  ALL: Object.values({
    GIAM_DOC: 'giam_doc', KE_TOAN: 'ke_toan',
    KINH_DOANH: 'kinh_doanh', KHO: 'kho', KY_THUAT: 'ky_thuat',
  }),
};

// ── Helpers ──
export const isManager = (role) => ROLE_GROUPS.MANAGERS.includes(role);
export const canAccessFinance = (role) => ROLE_GROUPS.FINANCE.includes(role);

// ── UI labels ──
export const ROLE_LABELS = {
  [ROLES.GIAM_DOC]: 'Giám đốc',
  [ROLES.KE_TOAN]: 'Kế toán',
  [ROLES.KINH_DOANH]: 'Kinh doanh',
  [ROLES.KHO]: 'Kho',
  [ROLES.KY_THUAT]: 'Kỹ thuật',
};
