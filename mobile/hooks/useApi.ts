import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import type {
  DashboardData,
  PaginatedResponse,
  Project,
  PurchaseOrder,
  Expense,
  ContractorPayment,
  Customer,
  CustomerInteraction,
  User,
  Warehouse,
  GoodsReceipt,
} from '@/lib/types';

/** All queries must only fire when user is authenticated */
function useIsReady() {
  const { isAuthenticated, isLoading } = useAuth();
  return isAuthenticated && !isLoading;
}

// ─── Dashboard ──────────────────────────────────────────────
export function useDashboard() {
  const ready = useIsReady();
  return useQuery<DashboardData>({
    queryKey: ['dashboard'],
    queryFn: () => apiFetch('/api/dashboard'),
    enabled: ready,
  });
}

// ─── Projects ───────────────────────────────────────────────
export function useProjects(page = 1, search = '', status = '') {
  const ready = useIsReady();
  const params = new URLSearchParams({ page: String(page), limit: '20' });
  if (search) params.set('search', search);
  if (status) params.set('status', status);

  return useQuery<PaginatedResponse<Project>>({
    queryKey: ['projects', page, search, status],
    queryFn: () => apiFetch(`/api/projects?${params}`),
    enabled: ready,
  });
}

export function useProject(id: string) {
  const ready = useIsReady();
  return useQuery<Project>({
    queryKey: ['project', id],
    queryFn: () => apiFetch(`/api/projects/${id}`),
    enabled: ready && !!id,
  });
}

// ─── Purchase Orders ────────────────────────────────────────
export function usePurchaseOrders(params: { status?: string; page?: number } = {}) {
  const ready = useIsReady();
  const search = new URLSearchParams({
    page: String(params.page || 1),
    limit: '20',
  });
  if (params.status) search.set('status', params.status);

  return useQuery<PaginatedResponse<PurchaseOrder>>({
    queryKey: ['purchase-orders', params],
    queryFn: () => apiFetch(`/api/purchase-orders?${search}`),
    enabled: ready,
  });
}

export function usePurchaseOrder(id: string) {
  const ready = useIsReady();
  return useQuery<PurchaseOrder>({
    queryKey: ['purchase-order', id],
    queryFn: () => apiFetch(`/api/purchase-orders/${id}`),
    enabled: ready && !!id,
  });
}

export function useApprovePO() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      apiFetch(`/api/purchase-orders/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['purchase-orders'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useCreatePO() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) =>
      apiFetch('/api/purchase-orders', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['purchase-orders'] });
    },
  });
}

// ─── Expenses ───────────────────────────────────────────────
export function useExpenses(params: { status?: string; page?: number } = {}) {
  const ready = useIsReady();
  const search = new URLSearchParams({
    page: String(params.page || 1),
    limit: '20',
  });
  if (params.status) search.set('status', params.status);

  return useQuery<PaginatedResponse<Expense>>({
    queryKey: ['expenses', params],
    queryFn: () => apiFetch(`/api/project-expenses?${search}`),
    enabled: ready,
  });
}

// ─── Contractor Payments ────────────────────────────────────
export function useContractorPayments(params: { status?: string; page?: number } = {}) {
  const ready = useIsReady();
  const search = new URLSearchParams({
    page: String(params.page || 1),
    limit: '20',
  });
  if (params.status) search.set('status', params.status);

  return useQuery<PaginatedResponse<ContractorPayment>>({
    queryKey: ['contractor-payments', params],
    queryFn: () => apiFetch(`/api/contractor-payments?${search}`),
    enabled: ready,
  });
}

// ─── Progress Reports ───────────────────────────────────────
export function useCreateProgressReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) =>
      apiFetch('/api/progress-reports', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['project'] });
    },
  });
}

// ─── Suppliers ──────────────────────────────────────────────
export function useSuppliers() {
  const ready = useIsReady();
  return useQuery({
    queryKey: ['suppliers'],
    queryFn: () => apiFetch('/api/suppliers?limit=100'),
    enabled: ready,
  });
}

// ─── Products ───────────────────────────────────────────────
export function useProducts() {
  const ready = useIsReady();
  return useQuery({
    queryKey: ['products'],
    queryFn: () => apiFetch('/api/products?limit=100'),
    enabled: ready,
  });
}

// ─── Warranty ───────────────────────────────────────────────
export function useWarrantyTickets(projectId?: string) {
  const ready = useIsReady();
  const params = projectId ? `?projectId=${projectId}` : '';
  return useQuery({
    queryKey: ['warranty', projectId],
    queryFn: () => apiFetch(`/api/warranty${params}`),
    enabled: ready,
  });
}

export function useCreateWarrantyTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) =>
      apiFetch('/api/warranty', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['warranty'] }),
  });
}

export function useUpdateWarrantyTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: any) =>
      apiFetch(`/api/warranty/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['warranty'] }),
  });
}

// ─── Expenses ───────────────────────────────────────────────
export function useCreateExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) =>
      apiFetch('/api/project-expenses', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expenses'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

// ─── Contracts ──────────────────────────────────────────────
export function useContracts(projectId?: string) {
  const ready = useIsReady();
  const params = projectId ? `?projectId=${projectId}&limit=20` : '?limit=20';
  return useQuery({
    queryKey: ['contracts', projectId],
    queryFn: () => apiFetch(`/api/contracts${params}`),
    enabled: ready,
  });
}

export function useContract(id: string) {
  const ready = useIsReady();
  return useQuery({
    queryKey: ['contract', id],
    queryFn: () => apiFetch(`/api/contracts/${id}`),
    enabled: ready && !!id,
  });
}

// ─── Schedule Tasks ─────────────────────────────────────────
export function useScheduleTask(id: string) {
  const ready = useIsReady();
  return useQuery({
    queryKey: ['schedule-task', id],
    queryFn: () => apiFetch(`/api/schedule-tasks/${id}`),
    enabled: ready && !!id,
  });
}

export function useUpdateScheduleTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: any) =>
      apiFetch(`/api/schedule-tasks/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    onSuccess: (_d, vars) => qc.invalidateQueries({ queryKey: ['schedule-task', vars.id] }),
  });
}

// ─── CRM Customers (Phase 1+2) ──────────────────────────────
export function useCustomers(params: { search?: string; ownerFilter?: 'mine' | 'unassigned' | 'all'; page?: number } = {}) {
  const ready = useIsReady();
  const qs = new URLSearchParams({ page: String(params.page || 1), limit: '50' });
  if (params.search) qs.set('search', params.search);
  return useQuery<PaginatedResponse<Customer>>({
    queryKey: ['customers', params],
    queryFn: () => apiFetch(`/api/customers?${qs}`),
    enabled: ready,
  });
}

export function useCustomer(id: string) {
  const ready = useIsReady();
  return useQuery<Customer>({
    queryKey: ['customer', id],
    queryFn: () => apiFetch(`/api/customers/${id}`),
    enabled: ready && !!id,
  });
}

export function useClaimCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiFetch(`/api/customers/${id}/claim`, { method: 'POST' }),
    onSuccess: (_d, id) => {
      qc.invalidateQueries({ queryKey: ['customers'] });
      qc.invalidateQueries({ queryKey: ['customer', id] });
    },
  });
}

export function useCreateInteraction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ customerId, ...data }: Partial<CustomerInteraction> & { customerId: string }) =>
      apiFetch(`/api/customers/${customerId}/interactions`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['customer', vars.customerId] });
      qc.invalidateQueries({ queryKey: ['customers'] });
    },
  });
}

export function useUsersByRole(role: string) {
  const ready = useIsReady();
  return useQuery<User[]>({
    queryKey: ['users', role],
    queryFn: () => apiFetch(`/api/users?role=${role}`),
    enabled: ready && !!role,
  });
}

// ─── Finance — Receivables (thu tiền) ───────────────────────
export function useReceivables() {
  const ready = useIsReady();
  return useQuery<{ payments: any[]; summary: { totalReceivable: number; totalReceived: number; outstanding: number } }>({
    queryKey: ['receivables'],
    queryFn: () => apiFetch('/api/finance/receivables'),
    enabled: ready,
  });
}

export function useCollectPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ contractId, paymentId, paidAmount, paidDate, status }: {
      contractId: string; paymentId: string; paidAmount: number; paidDate: string; status: string;
    }) => apiFetch(`/api/contracts/${contractId}/payments`, {
      method: 'PATCH',
      body: JSON.stringify({ paymentId, paidAmount, paidDate, status }),
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['receivables'] });
      qc.invalidateQueries({ queryKey: ['contracts'] });
    },
  });
}

// ─── Inventory ──────────────────────────────────────────────
export function useWarehouses() {
  const ready = useIsReady();
  return useQuery<PaginatedResponse<Warehouse> | Warehouse[]>({
    queryKey: ['warehouses'],
    queryFn: () => apiFetch('/api/warehouses?limit=100'),
    enabled: ready,
  });
}

export function useGoodsReceipts(params: { page?: number; poId?: string } = {}) {
  const ready = useIsReady();
  const qs = new URLSearchParams({ page: String(params.page || 1), limit: '30' });
  if (params.poId) qs.set('poId', params.poId);
  return useQuery<PaginatedResponse<GoodsReceipt>>({
    queryKey: ['goods-receipts', params],
    queryFn: () => apiFetch(`/api/inventory/receipts?${qs}`),
    enabled: ready,
  });
}

export function useCreateGoodsReceipt() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => apiFetch('/api/inventory/receipts', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['goods-receipts'] });
      qc.invalidateQueries({ queryKey: ['purchase-orders'] });
    },
  });
}

export function useStockIssues(params: { page?: number; projectId?: string } = {}) {
  const ready = useIsReady();
  const qs = new URLSearchParams({ page: String(params.page || 1), limit: '30' });
  if (params.projectId) qs.set('projectId', params.projectId);
  return useQuery<PaginatedResponse<any>>({
    queryKey: ['stock-issues', params],
    queryFn: () => apiFetch(`/api/inventory/issues?${qs}`),
    enabled: ready,
  });
}

export function useCreateStockIssue() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => apiFetch('/api/inventory/issues', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['stock-issues'] });
      qc.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

export function usePOsPendingReceive() {
  const ready = useIsReady();
  return useQuery<PaginatedResponse<PurchaseOrder>>({
    queryKey: ['purchase-orders', 'pending-receive'],
    queryFn: () => apiFetch(`/api/purchase-orders?limit=100`),
    enabled: ready,
    select: (data: any) => ({
      ...data,
      data: (data?.data || []).filter((po: any) =>
        po.status === 'Đã duyệt' || po.status === 'Nhận một phần',
      ),
    }),
  });
}
