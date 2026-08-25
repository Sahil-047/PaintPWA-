import { Router } from 'express';
import { serviceAuthMiddleware } from '../../middleware/serviceAuthMiddleware';
import { validateRequest } from '../../middleware/validateRequest';
import billController from '../../controllers/bill/billController';
import { downloadBillPdfSchema } from '../../validator/bill';
import { PayloadType } from '../../util/enum/common.enum';

const router = Router();

router.use(serviceAuthMiddleware);

router.post('/render', billController.renderBillPdf);

router.get(
  '/pdf/:tenantId/:billId',
  validateRequest({ schema: downloadBillPdfSchema, type: PayloadType.PARAMS }),
  billController.downloadBillPdf
);

export default router;
