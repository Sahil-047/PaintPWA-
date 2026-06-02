import { Router } from 'express';
import { authMiddleware } from '../../middlewares/auth.middleware.js';
import { approvedTenantMiddleware } from '../../middlewares/approved-tenant.middleware.js';
import { tenantMiddleware } from '../../middlewares/tenant.middleware.js';
import * as returnsController from './returns.controller.js';

const router = Router();

router.use(authMiddleware, approvedTenantMiddleware, tenantMiddleware);
router.get('/', returnsController.list);
router.post('/', returnsController.create);

export default router;

