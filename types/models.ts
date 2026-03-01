export interface User {
    id: string;
    email: string;
    name: string;
    role: string;
    active: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface Customer {
    id: string;
    code: string;
    name: string;
    phone: string;
    email: string;
    address: string;
    type: string;
    status: string;
    taxCode: string;
    representative: string;
    birthday: string | null;
    source: string;
    notes: string;
    totalRevenue: number;
    gender: string;
    projectAddress: string;
    projectName: string;
    salesPerson: string;
    designer: string;
    contactPerson2: string;
    phone2: string;
    pipelineStage: string;
    estimatedValue: number;
    nextFollowUp: string | null;
    score: number;
    lastContactAt: string | null;
    deletedAt: string | null;
    createdAt: string;
    updatedAt: string;
    projects?: Project[];
    quotations?: Quotation[];
    contracts?: Contract[];
}

export interface Project {
    id: string;
    code: string;
    name: string;
    type: string;
    address: string;
    description: string;
    area: number;
    floors: number;
    budget: number;
    spent: number;
    contractValue: number;
    paidAmount: number;
    status: string;
    phase: string;
    progress: number;
    startDate: string | null;
    endDate: string | null;
    manager: string;
    notes: string;
    customerId: string;
    customer?: Customer;
    deletedAt: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface Product {
    id: string;
    code: string;
    name: string;
    category: string;
    unit: string;
    importPrice: number;
    salePrice: number;
    stock: number;
    minStock: number;
    supplier: string;
    description: string;
    dimensions: string;
    weight: number;
    color: string;
    material: string;
    origin: string;
    warranty: string;
    brand: string;
    status: string;
    supplyType: string;
    leadTimeDays: number;
    location: string;
    image: string;
    deletedAt: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface Quotation {
    id: string;
    code: string;
    total: number;
    discount: number;
    vat: number;
    grandTotal: number;
    status: string;
    validUntil: string | null;
    notes: string;
    type: string;
    directCost: number;
    managementFeeRate: number;
    managementFee: number;
    designFee: number;
    otherFee: number;
    adjustment: number;
    adjustmentType: string;
    adjustmentAmount: number;
    customerId: string;
    projectId: string | null;
    customer?: Customer;
    project?: Project;
    categories?: QuotationCategory[];
    items?: QuotationItem[];
    deletedAt: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface QuotationCategory {
    id: string;
    name: string;
    order: number;
    subtotal: number;
    quotationId: string;
    items?: QuotationItem[];
}

export interface QuotationItem {
    id: string;
    name: string;
    order: number;
    unit: string;
    quantity: number;
    mainMaterial: number;
    auxMaterial: number;
    labor: number;
    unitPrice: number;
    amount: number;
    description: string;
    length: number;
    width: number;
    height: number;
    image: string;
    productId: string | null;
    quotationId: string;
    categoryId: string | null;
}

export interface Contract {
    id: string;
    code: string;
    name: string;
    type: string;
    contractValue: number;
    paidAmount: number;
    variationAmount: number;
    status: string;
    signDate: string | null;
    startDate: string | null;
    endDate: string | null;
    paymentTerms: string;
    notes: string;
    fileUrl: string;
    customerId: string;
    projectId: string;
    quotationId: string | null;
    customer?: Customer;
    project?: Project;
    payments?: ContractPayment[];
    deletedAt: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface ContractPayment {
    id: string;
    phase: string;
    amount: number;
    paidAmount: number;
    category: string;
    status: string;
    dueDate: string | null;
    paidDate: string | null;
    notes: string;
    proofUrl: string;
    contractId: string;
    createdAt: string;
}

export interface Supplier {
    id: string;
    code: string;
    name: string;
    type: string;
    contact: string;
    phone: string;
    email: string;
    address: string;
    taxCode: string;
    bankAccount: string;
    bankName: string;
    rating: number;
    notes: string;
    deletedAt: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface Contractor {
    id: string;
    code: string;
    name: string;
    type: string;
    phone: string;
    address: string;
    taxCode: string;
    bankAccount: string;
    bankName: string;
    rating: number;
    notes: string;
    deletedAt: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface Employee {
    id: string;
    code: string;
    name: string;
    position: string;
    phone: string;
    email: string;
    salary: number;
    status: string;
    joinDate: string | null;
    departmentId: string;
    department?: Department;
    deletedAt: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface Department {
    id: string;
    name: string;
    createdAt: string;
}

export interface WorkOrder {
    id: string;
    code: string;
    title: string;
    description: string;
    priority: string;
    status: string;
    assignee: string;
    dueDate: string | null;
    completedAt: string | null;
    category: string;
    projectId: string;
    project?: Project;
    deletedAt: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface ProjectExpense {
    id: string;
    code: string;
    expenseType: string;
    description: string;
    amount: number;
    paidAmount: number;
    category: string;
    status: string;
    submittedBy: string;
    approvedBy: string;
    proofUrl: string;
    recipientType: string;
    recipientId: string;
    recipientName: string;
    date: string;
    notes: string;
    projectId: string | null;
    project?: Project;
    deletedAt: string | null;
    createdAt: string;
    updatedAt: string;
}
