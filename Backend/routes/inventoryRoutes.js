import express from 'express';
import { 
  getBrands, 
  getProductsByBrand, 
  updateStock,
  getAllProducts,
  createBrand,
  createProduct,
  getProductTypesByBrand,
  getAllProductTypes,
  getProductsByBrandAndType,
  createOrUpdateProductType,
  bulkUploadProducts,
  updateProduct,
  deleteProduct
} from '../controllers/inventoryController.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = express.Router();

// All routes are protected
router.use(protect);

router.get('/brands', getBrands);
router.post('/brands', createBrand);
router.get('/products', getAllProducts);
router.post('/products', createProduct);
router.post('/products/bulk', bulkUploadProducts);
router.get('/types', getAllProductTypes);
router.get('/types/:brandId', getProductTypesByBrand);
router.post('/types', createOrUpdateProductType);
router.get('/products/:brandId/:type', getProductsByBrandAndType);
router.get('/products/:brandId', getProductsByBrand);
router.patch('/products/:productId/stock', updateStock);
router.put('/products/:productId', updateProduct);
router.delete('/products/:productId', deleteProduct);

export default router;

