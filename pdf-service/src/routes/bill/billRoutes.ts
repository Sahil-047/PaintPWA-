import { Router } from 'express';
import { validateRequest } from '../../middleware/validateRequest';
import billController from '../../controllers/bill/billController';
import { downloadBillPdfSchema } from '../../validator/bill';
import { PayloadType } from '../../util/enum/common.enum';

const router = Router();

router.get(
  '/pdf/:tenantId/:billId',
  validateRequest({ schema: downloadBillPdfSchema, type: PayloadType.PARAMS }),
  billController.downloadBillPdf
);

export default router;
