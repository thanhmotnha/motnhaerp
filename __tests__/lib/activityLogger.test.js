/**
 * Tests for lib/activityLogger.js
 */
import { vi } from 'vitest';
import { logActivity, computeDiff } from '@/lib/activityLogger';

vi.mock('@/lib/prisma', () => ({
    default: {
        activityLog: {
            create: vi.fn(),
        },
    },
}));

import prisma from '@/lib/prisma';

describe('logActivity', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        prisma.activityLog.create.mockResolvedValue({ id: 'test-log-id' });
    });

    test('should create activity log entry', async () => {
        await logActivity({
            action: 'create',
            entityType: 'Project',
            entityId: 'proj-123',
            entityLabel: 'DA-001 Test Project',
            actor: 'Test User',
            actorId: 'user-123',
        });

        expect(prisma.activityLog.create).toHaveBeenCalledWith({
            data: expect.objectContaining({
                action: 'create',
                entityType: 'Project',
                entityId: 'proj-123',
                entityLabel: 'DA-001 Test Project',
                actor: 'Test User',
                actorId: 'user-123',
            }),
        });
    });

    test('should not throw on database error', async () => {
        prisma.activityLog.create.mockRejectedValue(new Error('DB Error'));

        await expect(logActivity({
            action: 'create',
            entityType: 'Test',
            entityId: 'test',
            actor: 'System',
        })).resolves.not.toThrow();
    });
});

describe('computeDiff', () => {
    test('should detect changed fields', () => {
        const old = { name: 'Old Name', status: 'Nháp', value: 100 };
        const newObj = { name: 'New Name', status: 'Nháp', value: 200 };

        const diff = computeDiff(old, newObj, ['name', 'status', 'value']);
        expect(diff).toEqual({
            name: { old: 'Old Name', new: 'New Name' },
            value: { old: 100, new: 200 },
        });
    });

    test('should return null when no changes', () => {
        const obj = { name: 'Same', status: 'Same' };
        const diff = computeDiff(obj, obj, ['name', 'status']);
        expect(diff).toBeNull();
    });

    test('should handle null old object', () => {
        const diff = computeDiff(null, { name: 'New' }, ['name']);
        expect(diff).toEqual({ name: { old: undefined, new: 'New' } });
    });
});
