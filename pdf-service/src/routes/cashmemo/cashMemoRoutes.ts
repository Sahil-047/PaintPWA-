import { Router } from 'express';
import { serviceAuthMiddleware } from '../../middleware/serviceAuthMiddleware';
import { validateRequest } from '../../middleware/validateRequest';
import cashMemoController from '../../controllers/cashmemo/cashMemoController';
import { downloadCashMemoPdfSchema } from '../../validator/cashmemo';
import { PayloadType } from '../../util/enum/common.enum';

const router = Router();

router.use(serviceAuthMiddleware);

router.post('/render', cashMemoController.renderCashMemoPdf);

router.get(
  '/pdf/:tenantId/:memoId',
  validateRequest({ schema: downloadCashMemoPdfSchema, type: PayloadType.PARAMS }),
  cashMemoController.downloadCashMemoPdf
);

export default router;
