import { RequestHandler } from 'express';
import logger from '../../lib/winston/logger';
import BillModel from '../../model/billModel';
import { CustomError } from '../../util/helper/customError';
import { HttpStatusCode } from '../../util/enum/httpStatusCode.enum';
import generateSignedUrl from '../../util/helper/generateSignedUrl';
import { generateBillPdf, type BillPdfFormat } from '../../util/helper/pdfGenerator';
import type { PdfBillData } from '../../util/helper/pdfFormatters';

function parseFormat(value: unknown): BillPdfFormat {
  return String(value ?? 'standard').toLowerCase() === 'dl' ? 'dl' : 'standard';
}

class BillController {
  /** Sync render for the main API — returns raw PDF bytes. */
  renderBillPdf: RequestHandler = async (req, res, next) => {
    try {
      const pdfData = req.body?.pdfData as PdfBillData | undefined;
      if (!pdfData || !pdfData.customerName || !Array.isArray(pdfData.items)) {
        return next(new CustomError('Invalid bill PDF payload', HttpStatusCode.BAD_REQUEST));
      }

      const format = parseFormat(req.body?.format ?? req.query?.format);
      const buffer = await generateBillPdf(pdfData, format);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="bill-${format}.pdf"`);
      res.status(HttpStatusCode.OK).send(buffer);
    } catch (error) {
      logger.error('Error in renderBillPdf:', error);
      next(
        new CustomError(
          'Unable to render bill PDF. Please try again later.',
          HttpStatusCode.SERVICE_UNAVAILABLE
        )
      );
    }
  };

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
