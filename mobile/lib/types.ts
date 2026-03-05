import type { RoleKey } from './constants';

export interface User {
  id: string;
  name: string;
  email: string;
  role: RoleKey;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface Project {
  id: string;
  code: string;
  name: string;
  status: string;
  customerName?: string;
  customer?: { name: string };
  address?: string;
  startDate?: string;
  endDate?: string;
  value?: number;
  progress?: number;
  createdAt: string;
}

export interface DashboardData {
  stats: {
    customers: number;
    projects: number;
    products: number;
    quotations: number;
    contracts: number;
    workOrders: number;
    totalRevenue: number;
    totalExpense: number;
    activeProjects: number;
    pendingWorkOrders: number;
    contractValue: number;
    contractPaid: number;
  };
  recentProjects: Project[];
  projectsByStatus: Record<string, number>;
  lowStockProducts: any[];
  overdueWorkOrders: any[];
  pendingPOs: PurchaseOrder[];
  urgentCommitments: any[];
}

export interface PurchaseOrder {
  id: string;
  code: string;
  supplier: string;
  supplierId?: string;
  supplierRel?: { name: string };
  project?: { name: string; code: string };
  projectId: string;
  status: string;
  totalAmount: number;
  items: POItem[];
  note?: string;
  createdAt: string;
  createdBy?: string;
}

export interface POItem {
  id: string;
  productName: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalPrice: number;
}

export interface Expense {
  id: string;
  code: string;
  description: string;
  amount: number;
  status: string;
  category: string;
  project?: { name: string };
  createdAt: string;
}

export interface ContractorPayment {
  id: string;
  code: string;
  contractor?: { name: string };
  amount: number;
  status: string;
  createdAt: string;
}

export interface ProgressReport {
  id: string;
  projectId: string;
  description: string;
  progress: number;
  photos: string[];
  createdAt: string;
  createdBy?: string;
}
