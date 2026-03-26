/**
 * Role constants & helpers for RBAC
 * Used by apiHandler.js (options.roles) and frontend UI gating.
 *
 * Single source of truth — keep in sync with UsersTab.js role list.
 */

// ── Role constants ──
export const ROLES = {
  GIAM_DOC: 'giam_doc',
  PHO_GD: 'pho_gd',
  KE_TOAN: 'ke_toan',
  QUAN_LY_DU_AN: 'quan_ly_du_an',
  KY_THUAT: 'ky_thuat',
  NHAN_VIEN: 'nhan_vien',
};

// ── Preset groups (used in withAuth options.roles) ──
export const ROLE_GROUPS = {
  /** Giám đốc + Phó GĐ — can delete master data, manage users */
  MANAGERS: [ROLES.GIAM_DOC, ROLES.PHO_GD],

  /** Managers + Kế toán — financial routes */
  FINANCE: [ROLES.GIAM_DOC, ROLES.PHO_GD, ROLES.KE_TOAN],

  /** Finance + Quản lý DA — project operations */
  PROJECT_OPS: [ROLES.GIAM_DOC, ROLES.PHO_GD, ROLES.KE_TOAN, ROLES.QUAN_LY_DU_AN],

  /** General office access (all except nhan_vien) */
  OFFICE: [ROLES.GIAM_DOC, ROLES.PHO_GD, ROLES.KE_TOAN, ROLES.QUAN_LY_DU_AN, ROLES.KY_THUAT],

  /** All authenticated roles */
  ALL: Object.values({
    GIAM_DOC: 'giam_doc', PHO_GD: 'pho_gd', KE_TOAN: 'ke_toan',
    QUAN_LY_DU_AN: 'quan_ly_du_an', KY_THUAT: 'ky_thuat', NHAN_VIEN: 'nhan_vien',
  }),
};

// ── Helpers ──
export const isManager = (role) => ROLE_GROUPS.MANAGERS.includes(role);
export const canAccessFinance = (role) => ROLE_GROUPS.FINANCE.includes(role);
export const isOffice = (role) => ROLE_GROUPS.OFFICE.includes(role);

// ── UI labels ──
export const ROLE_LABELS = {
  [ROLES.GIAM_DOC]: 'Giám đốc',
  [ROLES.PHO_GD]: 'Phó GĐ',
  [ROLES.KE_TOAN]: 'Kế toán',
  [ROLES.QUAN_LY_DU_AN]: 'Quản lý DA',
  [ROLES.KY_THUAT]: 'Kỹ thuật',
  [ROLES.NHAN_VIEN]: 'Nhân viên',
};
