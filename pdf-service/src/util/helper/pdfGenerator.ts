import renderBillTemplate from './renderBillTemplate';
import renderCashMemoTemplate from './renderCashMemoTemplate';
import generatePdfBuffer from './generatePdfBuffer';
import {
  normalizeBillPdfData,
  normalizeCashMemoPdfData,
  PdfBillData,
  PdfCashMemoData,
} from './pdfFormatters';

export type { PdfBillData, PdfCashMemoData };

export async function generateBillPdf(data: PdfBillData): Promise<Buffer> {
  const templateData = normalizeBillPdfData(data);
  const html = await renderBillTemplate(templateData);
  return generatePdfBuffer(html, {
    width: templateData.pageWidth,
    height: templateData.pageHeight,
  });
}

export async function generateCashMemoPdf(data: PdfCashMemoData): Promise<Buffer> {
  const templateData = normalizeCashMemoPdfData(data);
  const html = await renderCashMemoTemplate(templateData);
  return generatePdfBuffer(html, { width: 640, height: 400 });
}
