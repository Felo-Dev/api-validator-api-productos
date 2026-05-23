import { describe, it, expect } from 'vitest';
import { sanitizeString, sanitizeObject } from '../utils/sanitize.js';

describe('XSS Sanitization', () => {
    it('should remove HTML tags from strings', () => {
        const input = '<script>alert("xss")</script>hello';
        const result = sanitizeString(input);
        expect(result).toBe('hello');
    });

    it('should handle clean strings', () => {
        const input = 'Hello World';
        expect(sanitizeString(input)).toBe('Hello World');
    });

    it('should sanitize object properties', () => {
        const input = { name: '<b>Test</b>', price: 100 };
        const result = sanitizeObject(input);
        expect(result.name).toBe('Test');
        expect(result.price).toBe(100);
    });
});
