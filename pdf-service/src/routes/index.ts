import { Router } from 'express';
import billRoutes from './bill/billRoutes';
import cashMemoRoutes from './cashmemo/cashMemoRoutes';

const router = Router();

router.use('/bill', billRoutes);
router.use('/cashmemo', cashMemoRoutes);

router.get('/health', (_req, res) => {
  res.json({ success: true, service: 'paint-pdf-service' });
});

export default router;
