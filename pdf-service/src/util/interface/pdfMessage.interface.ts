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

export interface BillPdfMessage {
  tenantId: string;
  billId: string;
  fileName: string;
  s3Key: string;
  pdfData: PdfBillData;
}

export interface CashMemoPdfMessage {
  tenantId: string;
  memoId: string;
  fileName: string;
  s3Key: string;
  pdfData: PdfCashMemoData;
}
