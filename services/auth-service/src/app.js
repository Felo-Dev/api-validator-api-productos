import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { loadConfig, success, createLogger } from '@ecommerce/shared';

const config = loadConfig({ PORT: 4001 });
const logger = createLogger('auth-service');

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json());
if (process.env.NODE_ENV !== 'production') app.use(morgan('dev'));

app.get('/health', (req, res) => success(res, { service: 'auth-service', status: 'ok' }));

app.use('/api', (req, res) => res.json({ success: true, data: { message: 'Auth service - migrate from existing code' } }));

app.use((req, res) => res.status(404).json({ success: false, message: 'Not found' }));

export default app;
export { config };
