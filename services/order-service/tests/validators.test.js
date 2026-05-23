import { describe, it, expect } from 'vitest';
import { createOrderSchema, addCartItemSchema } from '@ecommerce/shared';

describe('Order Service Validators', () => {
    describe('createOrderSchema', () => {
        it('should validate valid order', () => {
            const valid = {
                items: [{ productId: 1, quantity: 2, price: 29.99 }],
                shippingAddress: { street: '123 Main St', city: 'Test', state: 'TS', zipCode: '12345', country: 'US' },
                paymentMethod: 'credit_card',
            };
            expect(() => createOrderSchema.parse(valid)).not.toThrow();
        });

        it('should reject empty items', () => {
            expect(() => createOrderSchema.parse({
                items: [],
                shippingAddress: { street: '123', city: 'T', state: 'S', zipCode: '123', country: 'US' },
                paymentMethod: 'credit_card',
            })).toThrow();
        });
    });

    describe('addCartItemSchema', () => {
        it('should validate valid cart item', () => {
            expect(() => addCartItemSchema.parse({ productId: 1, quantity: 2 })).not.toThrow();
        });

        it('should reject quantity over 999', () => {
            expect(() => addCartItemSchema.parse({ productId: 1, quantity: 1000 })).toThrow();
        });
    });
});
