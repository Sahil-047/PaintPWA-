import renderBillTemplate from './renderBillTemplate';
import renderCashMemoTemplate from './renderCashMemoTemplate';
import generatePdfBuffer from './generatePdfBuffer';
import {
  BillPdfFormat,
  normalizeBillPdfData,
  normalizeCashMemoPdfData,
  PdfBillData,
  PdfCashMemoData,
} from './pdfFormatters';

export type { PdfBillData, PdfCashMemoData, BillPdfFormat };

export async function generateBillPdf(
  data: PdfBillData,
  format: BillPdfFormat = 'standard'
): Promise<Buffer> {
  const templateData = normalizeBillPdfData(data, format);
  const html = await renderBillTemplate(templateData);
  return generatePdfBuffer(html, {
    width: templateData.pdfWidth,
    height: templateData.pdfHeight,
  });
}

export async function generateCashMemoPdf(data: PdfCashMemoData): Promise<Buffer> {
  const templateData = normalizeCashMemoPdfData(data);
  const html = await renderCashMemoTemplate(templateData);
  return generatePdfBuffer(html, { width: 640, height: 400 });
}
