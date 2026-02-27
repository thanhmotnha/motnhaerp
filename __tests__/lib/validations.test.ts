import { describe, it, expect } from 'vitest';
import { customerCreateSchema } from '@/lib/validations/customer';
import { projectCreateSchema } from '@/lib/validations/project';
import { productCreateSchema } from '@/lib/validations/product';

describe('customerCreateSchema', () => {
    it('accepts valid customer data', () => {
        const data = { name: 'Nguyen Van A', phone: '0901234567' };
        const result = customerCreateSchema.parse(data);
        expect(result.name).toBe('Nguyen Van A');
        expect(result.phone).toBe('0901234567');
        expect(result.type).toBe('Cá nhân'); // default
    });

    it('rejects empty name', () => {
        expect(() => customerCreateSchema.parse({ name: '', phone: '123' }))
            .toThrow();
    });

    it('rejects missing phone', () => {
        expect(() => customerCreateSchema.parse({ name: 'Test' }))
            .toThrow();
    });

    it('strips unknown fields', () => {
        const data = { name: 'Test', phone: '123', hackField: 'injection' };
        // strict() should reject unknown fields
        expect(() => customerCreateSchema.parse(data)).toThrow();
    });

    it('applies defaults', () => {
        const result = customerCreateSchema.parse({ name: 'Test', phone: '123' });
        expect(result.email).toBe('');
        expect(result.gender).toBe('Nam');
        expect(result.pipelineStage).toBe('Lead');
        expect(result.estimatedValue).toBe(0);
    });
});

describe('projectCreateSchema', () => {
    it('accepts valid project data', () => {
        const data = { name: 'Test Project', type: 'Villa', customerId: 'cuid123' };
        const result = projectCreateSchema.parse(data);
        expect(result.name).toBe('Test Project');
        expect(result.status).toBe('Khảo sát');
    });

    it('rejects missing customerId', () => {
        expect(() => projectCreateSchema.parse({ name: 'Test', type: 'Villa' }))
            .toThrow();
    });
});

describe('productCreateSchema', () => {
    it('accepts valid product data', () => {
        const data = { name: 'Gạch', category: 'VLXD', unit: 'm2' };
        const result = productCreateSchema.parse(data);
        expect(result.status).toBe('Đang bán');
    });
});
