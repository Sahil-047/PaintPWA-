import { Router } from 'express';
import { authMiddleware } from '../../middlewares/auth.middleware.js';
import { tenantMiddleware } from '../../middlewares/tenant.middleware.js';
import * as inventoryController from './inventory.controller.js';

const router = Router();

router.use(authMiddleware, tenantMiddleware);

// Brands
router.get('/brands', inventoryController.listBrands);
router.post('/brands', inventoryController.createBrand);
router.patch('/brands/:id', inventoryController.updateBrand);
router.delete('/brands/:id', inventoryController.deleteBrand);

// Product types (per brand)
router.get('/brands/:brandId/types', inventoryController.listTypes);
router.post('/brands/:brandId/types', inventoryController.createType);
router.patch('/types/:id', inventoryController.updateType);
router.delete('/types/:id', inventoryController.deleteType);

// Products
router.get('/low-stock', inventoryController.lowStock);
router.get('/products/:id', inventoryController.getProduct);
router.patch('/products/:id/stock', inventoryController.updateStock);
router.delete('/products/:id', inventoryController.removeProduct);

// Root product routes (backward compat + filtered list)
router.get('/', inventoryController.list);
router.post('/', inventoryController.create);
router.patch('/:id', inventoryController.update);

export default router;
