import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { loadConfig, createLogger } from '@ecommerce/shared';
import jwt from 'jsonwebtoken';
import { createProxyMiddleware } from 'http-proxy-middleware';

const config = loadConfig({
    AUTH_SERVICE_URL: process.env.AUTH_SERVICE_URL || 'http://localhost:4001',
    PRODUCT_SERVICE_URL: process.env.PRODUCT_SERVICE_URL || 'http://localhost:4002',
    ORDER_SERVICE_URL: process.env.ORDER_SERVICE_URL || 'http://localhost:4003',
    NOTIFICATION_SERVICE_URL: process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:4004',
    BILLING_SERVICE_URL: process.env.BILLING_SERVICE_URL || 'http://localhost:4005',
});

const logger = createLogger('gateway');
const app = express();

app.use(helmet());
app.use(cors({
    origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
    credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
if (process.env.NODE_ENV !== 'production') app.use(morgan('dev'));

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    message: { success: false, message: 'Too many requests' },
    standardHeaders: true,
    legacyHeaders: false,
});
app.use(limiter);

app.get('/health', (req, res) => {
    res.json({
        success: true,
        data: {
            status: 'ok',
            services: {
                auth: config.AUTH_SERVICE_URL,
                products: config.PRODUCT_SERVICE_URL,
                orders: config.ORDER_SERVICE_URL,
                billing: config.BILLING_SERVICE_URL,
            },
        },
    });
});

app.get('/', (req, res) => {
    res.json({ success: true, data: { name: 'E-commerce API Gateway', version: '3.0.0', docs: '/api-docs' } });
});

const proxyOptions = (target) => ({
    target,
    changeOrigin: true,
    onProxyReq: (proxyReq, req) => {
        if (req.userId) {
            proxyReq.setHeader('X-User-Id', req.userId);
            proxyReq.setHeader('X-User-Role', req.userRole || 'user');
        }
    },
    onError: (err, req, res) => {
        logger.error(`Proxy error to ${target}:`, err.message);
        res.status(502).json({ success: false, message: 'Service unavailable' });
    },
});

const verifyToken = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
        return res.status(401).json({ success: false, message: 'Token required' });
    }
    try {
        const decoded = jwt.verify(authHeader.split(' ')[1], config.JWT_SECRET);
        req.userId = decoded.id;
        req.userRole = decoded.role || 'user';
        next();
    } catch {
        res.status(401).json({ success: false, message: 'Invalid token' });
    }
};

const optionalAuth = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
        try {
            const decoded = jwt.verify(authHeader.split(' ')[1], config.JWT_SECRET);
            req.userId = decoded.id;
            req.userRole = decoded.role || 'user';
        } catch {
            // Continue without auth
        }
    }
    next();
};

app.use('/api/auth', createProxyMiddleware(proxyOptions(config.AUTH_SERVICE_URL)));
app.use('/api/users', optionalAuth, createProxyMiddleware(proxyOptions(config.AUTH_SERVICE_URL)));
app.use('/api/products', optionalAuth, createProxyMiddleware(proxyOptions(config.PRODUCT_SERVICE_URL)));
app.use('/api/categories', optionalAuth, createProxyMiddleware(proxyOptions(config.PRODUCT_SERVICE_URL)));
app.use('/api/orders', verifyToken, createProxyMiddleware(proxyOptions(config.ORDER_SERVICE_URL)));
app.use('/api/cart', verifyToken, createProxyMiddleware(proxyOptions(config.ORDER_SERVICE_URL)));
app.use('/api/payments', verifyToken, createProxyMiddleware(proxyOptions(config.ORDER_SERVICE_URL)));
app.use('/api/notifications', verifyToken, createProxyMiddleware(proxyOptions(config.NOTIFICATION_SERVICE_URL)));
app.use('/api/invoices', verifyToken, createProxyMiddleware(proxyOptions(config.BILLING_SERVICE_URL)));
app.use('/api/fiscal-data', verifyToken, createProxyMiddleware(proxyOptions(config.BILLING_SERVICE_URL)));
app.use('/api/catalogs', createProxyMiddleware(proxyOptions(config.BILLING_SERVICE_URL)));

app.use((req, res) => {
    res.status(404).json({ success: false, message: `Route ${req.method} ${req.originalUrl} not found` });
});

app.use((err, req, res, next) => {
    logger.error('Unhandled error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
});

export default app;
export { config };
