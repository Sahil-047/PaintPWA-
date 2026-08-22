import { getPaintAppLogoDataUri } from './paintAppLogo';

export interface PdfBillItem {
  name: string;
  qty: number;
  rate: number;
  total: number;
  subtitle?: string;
}

export interface PdfBillData {
  billNo: string;
  firmName?: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  customerAddress?: string;
  billedByName?: string;
  billedByEmail?: string;
  billedByAddress?: string;
  items: PdfBillItem[];
  subtotal: number;
  discount: number;
  miscAmount?: number;
  miscRemark?: string;
  grandTotal: number;
  date: string;
  dueDate?: string;
  status?: 'paid' | 'partial' | 'due';
  orderRef?: string;
  soldBy?: string;
  delivery?: string;
  amountPaid?: number;
  creditApplied?: number;
  received?: number;
  balanceDue?: number;
}

export interface PdfCashMemoData {
  memoNo: string;
  firmName?: string;
  customerName: string;
  amountPaid: number;
  paymentMode: string;
  chequeNo?: string;
  date: string;
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatCurrency(value: number): string {
  return `Rs. ${value.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function itemTitle(name: string): string {
  return name.replace(/\s*\([^)]+\)\s*$/, '').trim() || name;
}

export function itemSubtitle(name: string, explicit?: string): string {
  if (explicit) return explicit;
  const m = name.match(/\(([^)]+)\)\s*$/);
  return m ? `Pack ${m[1]}` : '';
}

export function numberToWordsIndian(n: number): string {
  if (n <= 0) return 'Zero';
  const a = [
    '',
    'One',
    'Two',
    'Three',
    'Four',
    'Five',
    'Six',
    'Seven',
    'Eight',
    'Nine',
    'Ten',
    'Eleven',
    'Twelve',
    'Thirteen',
    'Fourteen',
    'Fifteen',
    'Sixteen',
    'Seventeen',
    'Eighteen',
    'Nineteen',
  ];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const two = (x: number) => (x < 20 ? a[x] : `${b[Math.floor(x / 10)]}${x % 10 ? ` ${a[x % 10]}` : ''}`);
  const three = (x: number) =>
    x > 99 ? `${a[Math.floor(x / 100)]} Hundred${x % 100 ? ` ${two(x % 100)}` : ''}` : two(x);
  let num = Math.floor(n);
  const crore = Math.floor(num / 10000000);
  num %= 10000000;
  const lakh = Math.floor(num / 100000);
  num %= 100000;
  const thousand = Math.floor(num / 1000);
  num %= 1000;
  const parts: string[] = [];
  if (crore) parts.push(`${three(crore)} Crore`);
  if (lakh) parts.push(`${three(lakh)} Lakh`);
  if (thousand) parts.push(`${three(thousand)} Thousand`);
  if (num) parts.push(three(num));
  return parts.join(' ');
}

export type BillPdfFormat = 'standard' | 'dl';

/** DL envelope strip: 3.9″ × 8.3″ (at 96 CSS px/in) */
export const BILL_PDF_DL = {
  widthIn: 3.9,
  heightIn: 8.3,
  widthPx: Math.round(3.9 * 96),
  heightPx: Math.round(8.3 * 96),
} as const;

export function normalizeBillPdfData(data: PdfBillData, format: BillPdfFormat = 'standard') {
  const received = data.received ?? (data.amountPaid ?? 0) + (data.creditApplied ?? 0);
  const balanceDue = data.balanceDue ?? Math.max(0, Number((data.grandTotal - received).toFixed(2)));
  const showPaymentBreakdown =
    received > 0.001 || (data.status !== 'due' && data.status !== undefined);
  const miscAmt = data.miscAmount ?? 0;
  const hasDiscount = data.discount > 0;
  const hasMisc = miscAmt > 0;
  const extraRows = (hasDiscount ? 1 : 0) + (hasMisc ? 1 : 0);
  const isDl = format === 'dl';
  const baseHeight = showPaymentBreakdown ? 580 : 540;
  const perItem = 28;
  const pageWidth = isDl ? BILL_PDF_DL.widthPx : 420;
  const pageHeight = isDl
    ? BILL_PDF_DL.heightPx
    : Math.min(820, baseHeight + Math.max(0, data.items.length + extraRows - 1) * perItem);

  return {
    format,
    isDl,
    pageWidth,
    pageHeight,
    pageWidthCss: isDl ? `${BILL_PDF_DL.widthIn}in` : `${pageWidth}px`,
    pageHeightCss: isDl ? `${BILL_PDF_DL.heightIn}in` : `${pageHeight}px`,
    pdfWidth: isDl ? `${BILL_PDF_DL.widthIn}in` : pageWidth,
    pdfHeight: isDl ? `${BILL_PDF_DL.heightIn}in` : pageHeight,
    firmName: (data.firmName ?? data.billedByName ?? 'Shop').trim() || 'Shop',
    logoDataUri: getPaintAppLogoDataUri(),
    formattedDate: formatDate(data.date),
    customerName: data.customerName || ' ',
    customerDetail: [data.customerPhone, data.customerAddress].filter(Boolean).join('  ·  '),
    items: data.items.map((item, idx) => ({
      sno: idx + 1,
      title: itemTitle(item.name),
      subtitle: itemSubtitle(item.name, item.subtitle),
      qty: item.qty,
      rateFormatted: formatCurrency(item.rate),
      totalFormatted: formatCurrency(item.total),
    })),
    hasDiscount,
    discountFormatted: formatCurrency(data.discount),
    hasMisc,
    miscLabel: data.miscRemark?.trim()
      ? `Add : Misc (${data.miscRemark.trim()})`
      : 'Add : Miscellaneous',
    miscFormatted: formatCurrency(miscAmt),
    grandTotalFormatted: formatCurrency(data.grandTotal),
    amountWords: `${numberToWordsIndian(data.grandTotal)} Rupees only`,
    showPaymentBreakdown,
    hasCredit: (data.creditApplied ?? 0) > 0.001,
    creditFormatted: formatCurrency(data.creditApplied ?? 0),
    hasCashPaid: (data.amountPaid ?? 0) > 0.001,
    amountPaidFormatted: formatCurrency(data.amountPaid ?? 0),
    receivedFormatted: formatCurrency(received),
    balanceDueFormatted: formatCurrency(balanceDue),
  };
}

export function normalizeCashMemoPdfData(data: PdfCashMemoData) {
  const isCheque = data.paymentMode.toLowerCase().includes('cheque');
  const modeLabel =
    (data.paymentMode || 'cash').charAt(0).toUpperCase() +
    (data.paymentMode || 'cash').slice(1).toLowerCase();
  const amountFormatted = formatCurrency(data.amountPaid);
  const amountBoxValue = data.amountPaid.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return {
    firmName: data.firmName ?? 'Shop',
    memoNo: data.memoNo,
    formattedDate: formatDate(data.date),
    modeLabel,
    customerName: data.customerName,
    amountWords: `${numberToWordsIndian(data.amountPaid)} only`,
    paymentLineLabel: isCheque ? 'by Cheque No.' : 'by',
    paymentLineValue: isCheque
      ? `${data.chequeNo ?? '—'}   ${amountFormatted}`
      : `${modeLabel}   ${amountFormatted}`,
    amountFormatted,
    amountBoxValue,
  };
}

export type BillTemplateData = ReturnType<typeof normalizeBillPdfData>;
export type CashMemoTemplateData = ReturnType<typeof normalizeCashMemoPdfData>;
