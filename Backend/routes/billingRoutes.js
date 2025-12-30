import express from 'express';
import { 
  createInvoice, 
  getInvoices, 
  getInvoice 
} from '../controllers/billingController.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = express.Router();

// All routes are protected
router.use(protect);

router.post('/invoices', createInvoice);
router.get('/invoices', getInvoices);
router.get('/invoices/:invoiceId', getInvoice);

export default router;

