import { describe, it, expect } from 'vitest';
import { createProductSchema, paginationSchema, createCategorySchema, createOrderSchema } from '@ecommerce/shared';

describe('Product Service Validators', () => {
    describe('createProductSchema', () => {
        it('should validate valid product', () => {
            const valid = { name: 'Test', category: 'Electronics', price: 29.99, stock: 10 };
            expect(() => createProductSchema.parse(valid)).not.toThrow();
        });

        it('should reject negative price', () => {
            expect(() => createProductSchema.parse({ name: 'Test', category: 'Test', price: -10 })).toThrow();
        });

        it('should reject empty name', () => {
            expect(() => createProductSchema.parse({ name: '', category: 'Test', price: 10 })).toThrow();
        });

        it('should default stock to 0', () => {
            const result = createProductSchema.parse({ name: 'Test', category: 'Test', price: 10 });
            expect(result.stock).toBe(0);
        });
    });

    describe('paginationSchema', () => {
        it('should use defaults', () => {
            const result = paginationSchema.parse({});
            expect(result.page).toBe(1);
            expect(result.limit).toBe(20);
        });

        it('should accept custom values', () => {
            const result = paginationSchema.parse({ page: 2, limit: 50, sortBy: 'price' });
            expect(result.page).toBe(2);
            expect(result.limit).toBe(50);
            expect(result.sortBy).toBe('price');
        });
    });

    describe('createCategorySchema', () => {
        it('should validate valid category', () => {
            const valid = { name: 'Electronics' };
            expect(() => createCategorySchema.parse(valid)).not.toThrow();
        });
    });
});
