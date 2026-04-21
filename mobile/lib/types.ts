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

export interface Customer {
  id: string;
  code: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  type: string;
  pipelineStage: string;
  status: string;
  source: string;
  score: number;
  lastContactAt: string | null;
  salesPersonId: string | null;
  salesPerson: { id: string; name: string; email: string } | null;
  salesPersonNote: string;
  nextFollowUp: string | null;
  estimatedValue: number;
  createdAt: string;
  // detail-only
  interactions?: CustomerInteraction[];
}

export interface CustomerInteraction {
  id: string;
  customerId: string;
  type: string;
  content: string;
  date: string;
  photos: string[];
  interestLevel: string;
  outcome: string;
  companionIds: string[];
  createdBy: string;
  createdByUser?: { id: string; name: string } | null;
  companions?: { id: string; name: string }[];
}

export type InterestLevel = '' | 'Nóng' | 'Ấm' | 'Lạnh';
export type InteractionOutcome = '' | 'Báo giá' | 'Đặt cọc' | 'Từ chối' | 'Cần gặp lại';
export type InteractionType = 'Gặp trực tiếp' | 'Điện thoại' | 'Zalo' | 'Email' | 'Ghi chú';

export interface Warehouse {
  id: string;
  code: string;
  name: string;
}

export interface POItemForReceive {
  id: string;
  productId: string | null;
  productName: string;
  unit: string;
  quantity: number;
  receivedQty: number;
  unitPrice: number;
  variantLabel?: string;
}

export interface GoodsReceipt {
  id: string;
  code: string;
  purchaseOrderId: string;
  warehouseId: string;
  receivedDate: string;
  receivedBy: string;
  notes: string;
  purchaseOrder?: { code: string; supplier: string };
  warehouse?: { name: string };
  items: Array<{
    id: string;
    productName: string;
    unit: string;
    qtyOrdered: number;
    qtyReceived: number;
    unitPrice: number;
  }>;
  createdAt: string;
}
