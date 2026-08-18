import { Router } from 'express';
import { authMiddleware } from '../../middlewares/auth.middleware.js';
import { approvedTenantMiddleware } from '../../middlewares/approved-tenant.middleware.js';
import { tenantMiddleware } from '../../middlewares/tenant.middleware.js';
import * as billingController from './billing.controller.js';

const router = Router();

router.use(authMiddleware, approvedTenantMiddleware, tenantMiddleware);

router.get('/', billingController.list);
router.post('/', billingController.create);
router.get('/products', billingController.listProducts);
router.post('/:id/payment', billingController.recordPayment);
router.get('/:id/pdf', billingController.downloadPdf);
router.get('/:id', billingController.getOne);

export default router;
