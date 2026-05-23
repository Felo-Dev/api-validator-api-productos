import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { loadConfig, eventBus, success, createLogger } from '@ecommerce/shared';
import routes from './routes/index.js';

const config = loadConfig({ PORT: 4003 });
const logger = createLogger('order-service');

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json());
if (process.env.NODE_ENV !== 'production') app.use(morgan('dev'));

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 200, message: { success: false, message: 'Too many requests' } });
app.use(limiter);

app.get('/health', (req, res) => success(res, { service: 'order-service', status: 'ok' }));

app.use('/api', routes);

app.use((req, res) => res.status(404).json({ success: false, message: 'Not found' }));

app.use((err, req, res, next) => {
    logger.error(err);
    res.status(500).json({ success: false, message: 'Internal server error' });
});

export default app;
export { config };
