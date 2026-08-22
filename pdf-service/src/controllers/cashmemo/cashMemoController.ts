import { RequestHandler } from 'express';
import logger from '../../lib/winston/logger';
import CashMemoModel from '../../model/cashMemoModel';
import { CustomError } from '../../util/helper/customError';
import { HttpStatusCode } from '../../util/enum/httpStatusCode.enum';
import generateSignedUrl from '../../util/helper/generateSignedUrl';
import { generateCashMemoPdf } from '../../util/helper/pdfGenerator';
import type { PdfCashMemoData } from '../../util/helper/pdfFormatters';

class CashMemoController {
  /** Sync render for the main API — returns raw PDF bytes. */
  renderCashMemoPdf: RequestHandler = async (req, res, next) => {
    try {
      const pdfData = req.body?.pdfData as PdfCashMemoData | undefined;
      if (!pdfData || !pdfData.customerName || pdfData.amountPaid == null) {
        return next(new CustomError('Invalid cash memo PDF payload', HttpStatusCode.BAD_REQUEST));
      }

      const buffer = await generateCashMemoPdf(pdfData);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'inline; filename="cashmemo.pdf"');
      res.status(HttpStatusCode.OK).send(buffer);
    } catch (error) {
      logger.error('Error in renderCashMemoPdf:', error);
      next(
        new CustomError(
          'Unable to render cash memo PDF. Please try again later.',
          HttpStatusCode.SERVICE_UNAVAILABLE
        )
      );
    }
  };

  downloadCashMemoPdf: RequestHandler = async (req, res, next) => {
    try {
      const { tenantId, memoId } = req.params;

      const memo = await CashMemoModel.findOne({ _id: memoId, tenantId });
      if (!memo) {
        return next(new CustomError('Cash memo not found', HttpStatusCode.NOT_FOUND));
      }

      if (!memo.pdfUrl) {
        return next(new CustomError('Cash memo PDF not ready yet', HttpStatusCode.NOT_FOUND));
      }

      const url = await generateSignedUrl({
        pdfKey: memo.pdfUrl,
        downloadFilename: `${memo.memoNo}.pdf`,
      });

      res.status(HttpStatusCode.OK).json({
        success: true,
        message: 'Cash memo PDF url generated successfully',
        data: { url },
      });
    } catch (error) {
      logger.error('Error in downloadCashMemoPdf:', error);
      next(
        new CustomError(
          'Unable to download cash memo PDF. Please try again later.',
          HttpStatusCode.SERVICE_UNAVAILABLE
        )
      );
    }
  };
}

export default new CashMemoController();
