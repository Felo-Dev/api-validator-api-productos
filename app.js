import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import pinoHttp from 'pino-http';
import config from './config.js';
import { sanitizeMiddleware } from './utils/sanitize.js';
import productsRoutes from './routes/products.routes.js';
import authRoute from './routes/auth.routes.js';
import userRoute from './routes/user.routes.js';
import { pool } from './db/connection.js';
import { swaggerUi, swaggerSpec } from './swagger/config.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Security headers
app.use(helmet({
    contentSecurityPolicy: process.env.NODE_ENV === 'production',
}));

// CORS
app.use(cors({
    origin: config.CORS_ORIGINS,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['X-Total-Count'],
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: config.RATE_LIMIT_WINDOW_MS,
    max: config.RATE_LIMIT_MAX,
    message: { message: 'Too many requests, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
});
app.use(limiter);

// Auth-specific rate limiting
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    message: { message: 'Too many authentication attempts, please try again later.' },
});
app.use('/api/auth/signin', authLimiter);

// Body parsing and sanitization
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(sanitizeMiddleware);

// Structured logging
app.use(pinoHttp({
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    redact: {
        paths: ['req.headers.authorization', 'res.headers["set-cookie"]'],
        remove: true,
    },
}));

// HTTP logging (development only)
if (process.env.NODE_ENV !== 'production') {
    app.use(morgan('dev'));
}

/**
 * @descripción Verifica el estado del servidor y la conexión a la base de datos
 * @param {Object} req - Objeto de solicitud de Express
 * @param {Object} res - Objeto de respuesta de Express
 */
// Health check
app.get('/health', async (req, res) => {
    try {
        const client = await pool.connect();
        await client.query('SELECT 1');
        client.release();
        res.json({ status: 'ok', timestamp: new Date().toISOString(), database: 'connected', uptime: process.uptime() });
    } catch (error) {
        res.status(503).json({ status: 'error', timestamp: new Date().toISOString(), database: 'disconnected', uptime: process.uptime() });
    }
});

/**
 * @descripción Ruta de bienvenida que muestra información general de la API
 * @param {Object} req - Objeto de solicitud de Express
 * @param {Object} res - Objeto de respuesta de Express
 */
// Welcome route
app.get('/', (req, res) => {
    res.json({ message: 'API Validator - Products API', version: '2.1.0', docs: '/api-docs' });
});

// Serve uploaded files
app.use(`/${config.UPLOAD_DIR}`, express.static(path.join(__dirname, config.UPLOAD_DIR)));

// Swagger docs
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Routes
app.use('/api/products', productsRoutes);
app.use('/api/auth', authRoute);
app.use('/api/users', userRoute);

/**
 * @descripción Middleware para manejar rutas no encontradas (404)
 * @param {Object} req - Objeto de solicitud de Express
 * @param {Object} res - Objeto de respuesta de Express
 */
// 404 handler
app.use((req, res) => {
    res.status(404).json({ message: `Route ${req.method} ${req.originalUrl} not found` });
});

/**
 * @descripción Middleware global de manejo de errores que categoriza y responde según el tipo de error
 * @param {Error} err - Error capturado por Express
 * @param {Object} req - Objeto de solicitud de Express
 * @param {Object} res - Objeto de respuesta de Express
 * @param {Function} next - Función next de Express
 */
// Global error handler
app.use((err, req, res, next) => {
    req.log.error(err);

    if (err.name === 'ValidationError') {
        return res.status(400).json({ message: err.message });
    }

    if (err.name === 'UnauthorizedError') {
        return res.status(401).json({ message: 'Unauthorized' });
    }

    if (err.code === '23505') {
        return res.status(409).json({ message: 'Resource already exists' });
    }

    if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ message: 'File too large. Maximum size is 5MB.' });
    }

    res.status(500).json({ message: 'Internal server error' });
});

export default app;
