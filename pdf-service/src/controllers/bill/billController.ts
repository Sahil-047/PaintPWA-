import { RequestHandler } from 'express';
import logger from '../../lib/winston/logger';
import BillModel from '../../model/billModel';
import { CustomError } from '../../util/helper/customError';
import { HttpStatusCode } from '../../util/enum/httpStatusCode.enum';
import generateSignedUrl from '../../util/helper/generateSignedUrl';

class BillController {
  downloadBillPdf: RequestHandler = async (req, res, next) => {
    try {
      const { tenantId, billId } = req.params;

      const bill = await BillModel.findOne({ _id: billId, tenantId });
      if (!bill) {
        return next(new CustomError('Bill not found', HttpStatusCode.NOT_FOUND));
      }

      if (!bill.pdfUrl) {
        return next(new CustomError('Bill PDF not ready yet', HttpStatusCode.NOT_FOUND));
      }

      const url = await generateSignedUrl({
        pdfKey: bill.pdfUrl,
        downloadFilename: `${bill.billNo}.pdf`,
      });

      res.status(HttpStatusCode.OK).json({
        success: true,
        message: 'Bill PDF url generated successfully',
        data: { url },
      });
    } catch (error) {
      logger.error('Error in downloadBillPdf:', error);
      next(
        new CustomError(
          'Unable to download bill PDF. Please try again later.',
          HttpStatusCode.SERVICE_UNAVAILABLE
        )
      );
    }
  };
}

export default new BillController();
