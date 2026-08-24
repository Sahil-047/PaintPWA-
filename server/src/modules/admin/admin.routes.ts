import { Router } from 'express';
import { authMiddleware } from '../../middlewares/auth.middleware.js';
import { superAdminMiddleware } from '../../middlewares/superadmin.middleware.js';
import * as adminController from './admin.controller.js';

const router = Router();

router.use(authMiddleware, superAdminMiddleware);

router.get('/tenants', adminController.listTenants);
router.patch('/tenants/:id/approve', adminController.approve);
router.patch('/tenants/:id/reject', adminController.reject);
router.patch('/tenants/:id/deactivate', adminController.deactivate);
router.patch('/tenants/:id/reactivate', adminController.reactivate);
router.delete('/tenants/:id', adminController.remove);

export default router;
