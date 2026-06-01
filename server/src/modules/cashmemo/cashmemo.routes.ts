import { Router } from 'express';
import { authMiddleware } from '../../middlewares/auth.middleware.js';
import { tenantMiddleware } from '../../middlewares/tenant.middleware.js';
import * as cashmemoController from './cashmemo.controller.js';

const router = Router();

router.use(authMiddleware, tenantMiddleware);

router.get('/', cashmemoController.list);
router.post('/', cashmemoController.create);
router.get('/:id/pdf', cashmemoController.downloadPdf);
router.get('/:id', cashmemoController.getOne);

export default router;
