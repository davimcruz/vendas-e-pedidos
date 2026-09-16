import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { env } from './config/env.js';
import { errorHandler, notFound } from './middlewares/errors.js';
import { authRouter } from './modules/auth/auth.routes.js';
import { couponRouter } from './modules/coupons/coupon.routes.js';
import { orderRouter } from './modules/orders/order.routes.js';
import { productRouter } from './modules/products/product.routes.js';
import { reportRouter } from './modules/reports/report.routes.js';
import { stockRouter } from './modules/stock/stock.routes.js';

export const app = express();

app.use(helmet());
app.use(cors({ origin: env.CORS_ORIGIN }));
app.use(express.json());
app.get('/health', (request, response) => {
  response.json({ status: 'ok' });
});
app.use('/auth', authRouter);
app.use('/produtos', productRouter);
app.use('/estoque', stockRouter);
app.use('/cupons', couponRouter);
app.use('/pedidos', orderRouter);
app.use('/relatorios', reportRouter);
app.use(notFound);
app.use(errorHandler);
