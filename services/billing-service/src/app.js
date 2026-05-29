import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { loadConfig, success, createLogger } from '@ecommerce/shared';
import routes from './routes/index.js';

const config = loadConfig({ PORT: 4005 });
const logger = createLogger('billing-service');

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json());
if (process.env.NODE_ENV !== 'production') app.use(morgan('dev'));

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 200, message: { success: false, message: 'Too many requests' } });
app.use(limiter);

/**
 * @descripción Endpoint de salud del servicio.
 * @param {Object} req - Objeto de solicitud Express.
 * @param {Object} res - Objeto de respuesta Express.
 */
app.get('/health', (req, res) => success(res, { service: 'billing-service', status: 'ok' }));

app.use('/api', routes);

/**
 * @descripción Middleware para rutas no encontradas (404).
 * @param {Object} req - Objeto de solicitud Express.
 * @param {Object} res - Objeto de respuesta Express.
 */
app.use((req, res) => res.status(404).json({ success: false, message: 'Not found' }));

/**
 * @descripción Middleware global de manejo de errores (500).
 * @param {Error} err - Error capturado.
 * @param {Object} req - Objeto de solicitud Express.
 * @param {Object} res - Objeto de respuesta Express.
 * @param {Function} next - Siguiente middleware.
 */
app.use((err, req, res, next) => {
    logger.error(err);
    res.status(500).json({ success: false, message: 'Internal server error' });
});

export default app;
export { config };
