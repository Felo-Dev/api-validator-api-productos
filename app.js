import express from 'express';
import morgan from 'morgan';
import productsRoutes from './routes/products.routes.js';
import authRoute from './routes/auth.routes.js';
import userRoute from './routes/user.routes.js';

const app = express();
app.use(morgan('dev'));
app.use(express.json());

app.get('/', (req, res) => {
    res.json("bienvenido a la nueva api");
});

// Usa SOLO el router de productos
app.use('/api/products', productsRoutes);

app.use('/api/auth', authRoute);
app.use('/api/users', userRoute);

export default app;

