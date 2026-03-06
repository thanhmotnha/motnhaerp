/**
 * Tests for lib/exportExcel.js
 */
import { exportToExcel, EXPORT_COLUMNS } from '@/lib/exportExcel';

describe('exportExcel', () => {
    beforeEach(() => {
        // Mock DOM elements
        global.URL.createObjectURL = jest.fn(() => 'blob:test');
        global.URL.revokeObjectURL = jest.fn();
        global.Blob = jest.fn((content, options) => ({ content, options }));
        document.createElement = jest.fn(() => ({
            click: jest.fn(),
            href: '',
            download: '',
        }));
    });

    test('should not crash with empty data', () => {
        expect(() => exportToExcel([], EXPORT_COLUMNS.projects, 'test')).not.toThrow();
    });

    test('should not crash with null data', () => {
        expect(() => exportToExcel(null, EXPORT_COLUMNS.projects, 'test')).not.toThrow();
    });

    test('should export data with correct columns', () => {
        const data = [
            { code: 'DA-001', name: 'Test Project', status: 'Đang thi công' },
        ];
        exportToExcel(data, EXPORT_COLUMNS.projects, 'projects');
        expect(global.Blob).toHaveBeenCalled();
        expect(document.createElement).toHaveBeenCalledWith('a');
    });

    test('EXPORT_COLUMNS should have presets', () => {
        expect(EXPORT_COLUMNS.projects).toBeDefined();
        expect(EXPORT_COLUMNS.customers).toBeDefined();
        expect(EXPORT_COLUMNS.employees).toBeDefined();
        expect(EXPORT_COLUMNS.payroll).toBeDefined();
    });
});

describe('EXPORT_COLUMNS format functions', () => {
    test('projects progress format', () => {
        const progressCol = EXPORT_COLUMNS.projects.find(c => c.key === 'progress');
        expect(progressCol.format(75)).toBe('75%');
        expect(progressCol.format(0)).toBe('0%');
    });

    test('customers projects count format', () => {
        const projCol = EXPORT_COLUMNS.customers.find(c => c.key === 'projects');
        expect(projCol.format([1, 2, 3])).toBe(3);
        expect(projCol.format(null)).toBe(0);
    });
});
