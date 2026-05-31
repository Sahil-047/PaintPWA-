import { Router } from 'express';
import { authMiddleware } from '../../middlewares/auth.middleware.js';
import { tenantMiddleware } from '../../middlewares/tenant.middleware.js';
import * as expensesController from './expenses.controller.js';

const router = Router();

router.use(authMiddleware, tenantMiddleware);

router.get('/', expensesController.list);
router.post('/', expensesController.create);
router.delete('/:id', expensesController.remove);

export default router;
