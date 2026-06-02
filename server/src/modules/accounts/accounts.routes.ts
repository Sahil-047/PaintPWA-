import { Router } from 'express';
import { authMiddleware } from '../../middlewares/auth.middleware.js';
import { approvedTenantMiddleware } from '../../middlewares/approved-tenant.middleware.js';
import { tenantMiddleware } from '../../middlewares/tenant.middleware.js';
import * as accountsController from './accounts.controller.js';

const router = Router();

router.use(authMiddleware, approvedTenantMiddleware, tenantMiddleware);

router.get('/', accountsController.listAccounts);
router.get('/customers', accountsController.listCustomers);
router.post('/customers', accountsController.createCustomer);
router.get('/customers/:customerId', accountsController.getCustomerDetail);
router.patch('/customers/:customerId', accountsController.updateCustomer);

export default router;
