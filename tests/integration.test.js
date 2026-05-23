import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../app.js';

describe('API Integration Tests', () => {
    describe('Root Endpoint', () => {
        it('should return API info on /', async () => {
            const res = await request(app).get('/');
            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('message');
            expect(res.body).toHaveProperty('version');
            expect(res.body).toHaveProperty('docs');
        });
    });

    describe('404 Handler', () => {
        it('should return 404 for unknown routes', async () => {
            const res = await request(app).get('/api/nonexistent');
            expect(res.status).toBe(404);
            expect(res.body).toHaveProperty('message');
        });
    });

    describe('Auth Validation', () => {
        it('should reject signup with missing fields', async () => {
            const res = await request(app)
                .post('/api/auth/signup')
                .send({ username: 'test' });
            expect(res.status).toBe(400);
            expect(res.body).toHaveProperty('errors');
        });

        it('should reject signin with missing fields', async () => {
            const res = await request(app)
                .post('/api/auth/signin')
                .send({ email: 'test@example.com' });
            expect(res.status).toBe(400);
            expect(res.body).toHaveProperty('errors');
        });
    });

    describe('Products Auth Guards', () => {
        it('should reject product creation without token', async () => {
            const res = await request(app)
                .post('/api/products')
                .send({ name: 'Test', price: 10 });
            expect(res.status).toBe(403);
        });

        it('should reject product update without token', async () => {
            const res = await request(app)
                .put('/api/products/1')
                .send({ name: 'Updated' });
            expect(res.status).toBe(403);
        });

        it('should reject product delete without token', async () => {
            const res = await request(app)
                .delete('/api/products/1');
            expect(res.status).toBe(403);
        });
    });

    describe('Security Headers', () => {
        it('should set security headers', async () => {
            const res = await request(app).get('/');
            expect(res.headers).toHaveProperty('x-dns-prefetch-control');
            expect(res.headers).toHaveProperty('x-frame-options');
            expect(res.headers).toHaveProperty('x-content-type-options');
        });
    });

    describe('CORS', () => {
        it('should handle preflight OPTIONS requests', async () => {
            const res = await request(app)
                .options('/api/products')
                .set('Origin', 'http://localhost:3000')
                .set('Access-Control-Request-Method', 'GET');
            expect(res.status).toBe(204);
        });
    });

    describe('Swagger', () => {
        it('should serve swagger docs', async () => {
            const res = await request(app).get('/api-docs/');
            expect(res.status).toBe(200);
            expect(res.headers['content-type']).toContain('text/html');
        });
    });
});
