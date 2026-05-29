import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { loadConfig, success, createLogger } from '@ecommerce/shared';
import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/user.routes.js';

const config = loadConfig({ PORT: 4001 });
const logger = createLogger('auth-service');

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json());
if (process.env.NODE_ENV !== 'production') app.use(morgan('dev'));

app.get('/health', (req, res) => success(res, { service: 'auth-service', status: 'ok' }));

app.use('/', authRoutes);
app.use('/api/users', userRoutes);

app.use((req, res) => res.status(404).json({ success: false, message: 'Not found' }));

app.use((err, req, res, next) => {
    logger.error('Unhandled error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
});

export default app;
export { config };
