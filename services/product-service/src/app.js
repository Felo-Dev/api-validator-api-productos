import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { loadConfig, eventBus, success, createLogger } from '@ecommerce/shared';
import routes from './routes/index.js';

const config = loadConfig({ PORT: 4002 });
const logger = createLogger('product-service');

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json());
if (process.env.NODE_ENV !== 'production') app.use(morgan('dev'));

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 300, message: { success: false, message: 'Too many requests' } });
app.use(limiter);

/**
 * @descripción Ruta de salud para verificar que el servicio está operativo.
 * @param {import('express').Request} req - Objeto de solicitud.
 * @param {import('express').Response} res - Objeto de respuesta.
 */
app.get('/health', (req, res) => success(res, { service: 'product-service', status: 'ok' }));

app.use('/api', routes);

/**
 * @descripción Middleware para rutas no encontradas (404).
 * @param {import('express').Request} req - Objeto de solicitud.
 * @param {import('express').Response} res - Objeto de respuesta.
 */
app.use((req, res) => res.status(404).json({ success: false, message: 'Not found' }));

/**
 * @descripción Middleware de manejo global de errores. Registra el error y responde con 500.
 * @param {Error} err - Objeto de error.
 * @param {import('express').Request} req - Objeto de solicitud.
 * @param {import('express').Response} res - Objeto de respuesta.
 * @param {import('express').NextFunction} next - Función siguiente.
 */
app.use((err, req, res, next) => {
    logger.error(err);
    res.status(500).json({ success: false, message: 'Internal server error' });
});

export default app;
export { config };
