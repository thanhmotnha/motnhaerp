export interface PaginationInfo {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
}

export interface PaginatedResponse<T> {
    data: T[];
    pagination: PaginationInfo;
}

export interface ApiError {
    error: string;
    details?: Array<{
        path: string[];
        message: string;
    }>;
}

export interface DashboardStats {
    revenue: number;
    expense: number;
    projects: number;
    activeProjects: number;
    customers: number;
    products: number;
    quotations: number;
    contracts: number;
    workOrders: number;
    pendingWorkOrders: number;
    totalContractValue: number;
    totalPaid: number;
}
