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
if (process.env.NODE_ENV !== 'production') app.use(morgan('dev'));

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    message: { success: false, message: 'Too many requests' },
    standardHeaders: true,
    legacyHeaders: false,
});
app.use(limiter);

/**
 * @descripción Ruta de verificación de salud del gateway que muestra el estado de los servicios
 * @param {Object} req - Objeto de petición de Express
 * @param {Object} res - Objeto de respuesta de Express
 */
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

/**
 * @descripción Ruta raíz que muestra información general del API Gateway
 * @param {Object} req - Objeto de petición de Express
 * @param {Object} res - Objeto de respuesta de Express
 */
app.get('/', (req, res) => {
    res.json({ success: true, data: { name: 'E-commerce API Gateway', version: '3.0.0', docs: '/api-docs' } });
});

/**
 * @descripción Crea opciones de proxy para http-proxy-middleware con inyección de headers de usuario
 * @param {string} target - URL del servicio destino al que redirigir las peticiones
 * @returns {Object} - Opciones de configuración del proxy
 */
const proxyOptions = (target, rewritePath = false) => ({
    target,
    changeOrigin: true,
    ...(rewritePath ? { pathRewrite: (path, req) => req.baseUrl + path } : {}),
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

const authProxy = createProxyMiddleware(proxyOptions(config.AUTH_SERVICE_URL));
const usersProxy = createProxyMiddleware(proxyOptions(config.AUTH_SERVICE_URL, true));
const productProxy = createProxyMiddleware(proxyOptions(config.PRODUCT_SERVICE_URL, true));
const orderProxy = createProxyMiddleware(proxyOptions(config.ORDER_SERVICE_URL, true));
const notificationProxy = createProxyMiddleware(proxyOptions(config.NOTIFICATION_SERVICE_URL, true));
const billingProxy = createProxyMiddleware(proxyOptions(config.BILLING_SERVICE_URL, true));

/**
 * @descripción Middleware que verifica y decodifica el token JWT del header Authorization. Rechaza la petición si el token es inválido o falta
 * @param {Object} req - Objeto de petición de Express
 * @param {Object} res - Objeto de respuesta de Express
 * @param {Function} next - Función next de Express
 * @returns {void}
 */
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

/**
 * @descripción Middleware que decodifica opcionalmente el token JWT sin rechazar la petición si no está presente o es inválido
 * @param {Object} req - Objeto de petición de Express
 * @param {Object} res - Objeto de respuesta de Express
 * @param {Function} next - Función next de Express
 * @returns {void}
 */
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

const forwardUserHeaders = (req, res, next) => {
    if (req.userId) {
        req.headers['x-user-id'] = String(req.userId);
        req.headers['x-user-role'] = req.userRole || 'user';
    }
    next();
};

app.use('/api/auth', authProxy);
app.use('/api/users', optionalAuth, forwardUserHeaders, usersProxy);
app.use('/api/products', optionalAuth, forwardUserHeaders, productProxy);
app.use('/api/categories', optionalAuth, forwardUserHeaders, productProxy);
app.use('/api/orders', verifyToken, forwardUserHeaders, orderProxy);
app.use('/api/cart', verifyToken, forwardUserHeaders, orderProxy);
app.use('/api/payments', verifyToken, forwardUserHeaders, orderProxy);
app.use('/api/notifications', verifyToken, forwardUserHeaders, notificationProxy);
app.use('/api/invoices', verifyToken, forwardUserHeaders, billingProxy);
app.use('/api/fiscal-data', verifyToken, forwardUserHeaders, billingProxy);
app.use('/api/catalogs', billingProxy);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

/**
 * @descripción Middleware para rutas no encontradas (404)
 * @param {Object} req - Objeto de petición de Express
 * @param {Object} res - Objeto de respuesta de Express
 */
app.use((req, res) => {
    res.status(404).json({ success: false, message: `Route ${req.method} ${req.originalUrl} not found` });
});

/**
 * @descripción Middleware global de manejo de errores no capturados
 * @param {Error} err - Objeto de error
 * @param {Object} req - Objeto de petición de Express
 * @param {Object} res - Objeto de respuesta de Express
 * @param {Function} next - Función next de Express
 */
app.use((err, req, res, next) => {
    logger.error('Unhandled error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
});

export default app;
export { config };
