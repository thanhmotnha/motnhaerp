// API base URL — change this to your production URL
// For Android emulator, 10.0.2.2 maps to host localhost
// For physical device, use your computer's local IP or production URL
export const API_BASE_URL = 'https://erp.motnha.vn';

export const COLORS = {
  primary: '#1e3a5f',
  primaryLight: '#2c5282',
  primaryDark: '#152a45',
  accent: '#e67e22',
  success: '#27ae60',
  danger: '#e74c3c',
  warning: '#f39c12',
  info: '#3498db',
  white: '#ffffff',
  background: '#f5f7fa',
  card: '#ffffff',
  text: '#1a202c',
  textSecondary: '#718096',
  textLight: '#a0aec0',
  border: '#e2e8f0',
  borderLight: '#edf2f7',
  disabled: '#cbd5e0',
};

export const ROLES = {
  giam_doc:   { label: 'Giám đốc',   icon: '👑', color: '#c0392b' },
  ke_toan:    { label: 'Kế toán',    icon: '📊', color: '#2980b9' },
  kinh_doanh: { label: 'Kinh doanh', icon: '💼', color: '#8e44ad' },
  kho:        { label: 'Kho',        icon: '📦', color: '#16a085' },
  ky_thuat:   { label: 'Kỹ thuật',   icon: '🔧', color: '#27ae60' },
  khach_hang: { label: 'Khách hàng', icon: '🏠', color: '#16a085' },
} as const;

export const FINANCE_ROLES = ['giam_doc', 'ke_toan'];
export const APPROVAL_ROLES = ['giam_doc'];
export const CUSTOMER_ROLES = ['khach_hang'];

export type RoleKey = keyof typeof ROLES;
