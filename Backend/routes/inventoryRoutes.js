import express from 'express';
import { 
  getBrands, 
  getProductsByBrand, 
  updateStock,
  getAllProducts,
  createBrand,
  createProduct,
  getProductTypesByBrand,
  getProductsByBrandAndType,
  createOrUpdateProductType
} from '../controllers/inventoryController.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = express.Router();

// All routes are protected
router.use(protect);

router.get('/brands', getBrands);
router.post('/brands', createBrand);
router.get('/products', getAllProducts);
router.post('/products', createProduct);
router.get('/types/:brandId', getProductTypesByBrand);
router.post('/types', createOrUpdateProductType);
router.get('/products/:brandId/:type', getProductsByBrandAndType);
router.get('/products/:brandId', getProductsByBrand);
router.patch('/products/:productId/stock', updateStock);

export default router;

