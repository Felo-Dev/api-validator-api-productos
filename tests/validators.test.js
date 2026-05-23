import { describe, it, expect } from 'vitest';
import { signupSchema, signinSchema, productSchema, paginationSchema } from '../utils/validators.js';

describe('Zod Validation', () => {
    describe('signupSchema', () => {
        it('should validate valid signup data', () => {
            const valid = {
                username: 'testuser',
                email: 'test@example.com',
                password: 'Test123!',
            };
            expect(() => signupSchema.parse(valid)).not.toThrow();
        });

        it('should reject short password', () => {
            const invalid = {
                username: 'testuser',
                email: 'test@example.com',
                password: 'short',
            };
            expect(() => signupSchema.parse(invalid)).toThrow();
        });

        it('should reject invalid email', () => {
            const invalid = {
                username: 'testuser',
                email: 'not-an-email',
                password: 'Test123!',
            };
            expect(() => signupSchema.parse(invalid)).toThrow();
        });

        it('should reject username with special chars', () => {
            const invalid = {
                username: 'test@user!',
                email: 'test@example.com',
                password: 'Test123!',
            };
            expect(() => signupSchema.parse(invalid)).toThrow();
        });
    });

    describe('productSchema', () => {
        it('should validate valid product', () => {
            const valid = {
                name: 'Test Product',
                category: 'Electronics',
                price: 29.99,
            };
            expect(() => productSchema.parse(valid)).not.toThrow();
        });

        it('should reject negative price', () => {
            const invalid = {
                name: 'Test Product',
                price: -10,
            };
            expect(() => productSchema.parse(invalid)).toThrow();
        });

        it('should coerce string price to number', () => {
            const data = {
                name: 'Test Product',
                price: '29.99',
            };
            const result = productSchema.parse(data);
            expect(result.price).toBe(29.99);
        });
    });

    describe('paginationSchema', () => {
        it('should use defaults', () => {
            const result = paginationSchema.parse({});
            expect(result.page).toBe(1);
            expect(result.limit).toBe(20);
        });

        it('should parse valid page and limit', () => {
            const result = paginationSchema.parse({ page: 2, limit: 50 });
            expect(result.page).toBe(2);
            expect(result.limit).toBe(50);
        });

        it('should reject limit over 100', () => {
            expect(() => paginationSchema.parse({ limit: 101 })).toThrow();
        });
    });
});
