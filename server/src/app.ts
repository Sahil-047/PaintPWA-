import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { ZodError } from 'zod';
import { env } from './config/env.js';
import { errorMiddleware } from './middlewares/error.middleware.js';
import { AppError } from './utils/appError.js';
import authRoutes from './modules/auth/auth.routes.js';
import inventoryRoutes from './modules/inventory/inventory.routes.js';
import billingRoutes from './modules/billing/billing.routes.js';
import cashmemoRoutes from './modules/cashmemo/cashmemo.routes.js';
import accountsRoutes from './modules/accounts/accounts.routes.js';
import expensesRoutes from './modules/expenses/expenses.routes.js';
import paintersRoutes from './modules/painters/painters.routes.js';
import reportsRoutes from './modules/reports/reports.routes.js';
import adminRoutes from './modules/admin/admin.routes.js';
import returnsRoutes from './modules/returns/returns.routes.js';

const app = express();

app.set('trust proxy', 1);

app.use(
  cors({
    origin: [
      'http://localhost:5173',
      'https://paintappstore.in',
      'https://www.paintappstore.in',
      'https://app.paintappstore.in',
    ],
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

app.get('/api/health', (_req, res) => {
  res.json({ success: true, message: 'paintapp API', version: '2.0.0' });
});

app.use('/api/auth', authRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/bills', billingRoutes);
app.use('/api/cashmemos', cashmemoRoutes);
app.use('/api/accounts', accountsRoutes);
app.use('/api/expenses', expensesRoutes);
app.use('/api/painters', paintersRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/returns', returnsRoutes);

app.use((_req, _res, next) => {
  next(new AppError('Route not found', 404));
});

app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err instanceof ZodError) {
    const firstIssue = err.issues[0]?.message ?? 'Validation failed';
    res.status(400).json({
      success: false,
      message: firstIssue,
      errors: err.flatten().fieldErrors,
    });
    return;
  }
  errorMiddleware(err, req, res, next);
});

export default app;

