import { Router } from 'express';
import { authMiddleware } from '../../middlewares/auth.middleware.js';
import { approvedTenantMiddleware } from '../../middlewares/approved-tenant.middleware.js';
import { tenantMiddleware } from '../../middlewares/tenant.middleware.js';
import * as reportsController from './reports.controller.js';

const router = Router();

router.use(authMiddleware, approvedTenantMiddleware, tenantMiddleware);

router.get('/dashboard', reportsController.dashboard);
router.get('/overview', reportsController.overview);
router.get('/snapshots', reportsController.snapshots);
router.get('/snapshots/:period', reportsController.snapshotByPeriod);

export default router;
