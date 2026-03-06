// Jest setup - mock PrismaClient and other globals

jest.mock('@/lib/prisma', () => {
    const mockPrisma = {
        project: { findMany: jest.fn(), count: jest.fn(), create: jest.fn(), update: jest.fn(), findUnique: jest.fn() },
        customer: { findMany: jest.fn(), count: jest.fn(), create: jest.fn(), update: jest.fn(), findUnique: jest.fn() },
        contract: { findMany: jest.fn(), count: jest.fn(), create: jest.fn(), update: jest.fn() },
        quotation: { findMany: jest.fn(), count: jest.fn(), create: jest.fn(), update: jest.fn(), findUnique: jest.fn() },
        workOrder: { findMany: jest.fn(), count: jest.fn(), create: jest.fn(), update: jest.fn() },
        employee: { findMany: jest.fn(), count: jest.fn(), create: jest.fn(), update: jest.fn() },
        activityLog: { create: jest.fn(), findMany: jest.fn(), count: jest.fn(), groupBy: jest.fn() },
        department: { findMany: jest.fn() },
        $transaction: jest.fn(fn => fn(mockPrisma)),
    };
    return { __esModule: true, default: mockPrisma };
});

jest.mock('next-auth', () => ({
    getServerSession: jest.fn(() => ({ user: { id: 'test-id', name: 'Test User', role: 'giam_doc', email: 'test@test.com' } })),
}));

jest.mock('@/lib/auth', () => ({
    authOptions: {},
}));

jest.mock('@/lib/rateLimit', () => ({
    rateLimit: jest.fn(() => ({ success: true })),
}));

jest.mock('jsonwebtoken', () => ({
    verify: jest.fn(),
}));
