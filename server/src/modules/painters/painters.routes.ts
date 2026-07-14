import { Router } from 'express';
import { authMiddleware } from '../../middlewares/auth.middleware.js';
import { approvedTenantMiddleware } from '../../middlewares/approved-tenant.middleware.js';
import { tenantMiddleware } from '../../middlewares/tenant.middleware.js';
import * as paintersController from './painters.controller.js';

const router = Router();

router.use(authMiddleware, approvedTenantMiddleware, tenantMiddleware);

router.get('/', paintersController.list);
router.post('/', paintersController.create);
router.get('/:id', paintersController.getDetail);
router.patch('/:id', paintersController.update);
router.delete('/:id', paintersController.remove);
router.post('/:id/payments', paintersController.recordPayment);

export default router;
