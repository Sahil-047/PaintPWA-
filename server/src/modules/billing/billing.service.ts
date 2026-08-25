import { Types } from 'mongoose';
import { AppError } from '../../utils/appError.js';
import { generateBillNo } from '../../utils/invoice.number.js';
import { buildPdfKey } from '../../utils/pdf.storage.js';
import { queueBillPdfJob, resolveBillPdf } from '../../utils/pdf.job.js';
import type { PdfBillData } from '../../types/pdf.types.js';
import * as accountsService from '../accounts/accounts.service.js';
import { CustomerModel } from '../accounts/customer.model.js';
import { TenantModel, UserModel } from '../auth/auth.model.js';
import * as inventoryService from '../inventory/inventory.service.js';
import { BillModel } from './billing.model.js';
import type { CreateBillInput, RecordBillPaymentInput } from './billing.validator.js';

/** Shop profile from Settings / tenant — used as invoice “Billed by”. */
async function getShopBillingIdentity(tenantId: Types.ObjectId) {
  const [tenant, owner] = await Promise.all([
    TenantModel.findById(tenantId).lean(),
    UserModel.findOne({ tenantId, role: 'admin' }).sort({ createdAt: 1 }).lean(),
  ]);

  const shopName = tenant?.name?.trim() || 'Shop';
  const email = owner?.email?.trim() || '';
  const phone = tenant?.phone?.trim() || '';
  const address = tenant?.address?.trim() || '';

  const addressLines = [address, phone ? `Phone: ${phone}` : ''].filter(Boolean).join('\n');

  return {
    firmName: shopName,
    billedByName: shopName,
    billedByEmail: email || undefined,
    billedByAddress: addressLines || undefined,
    soldBy: shopName,
  };
}

function billReceived(bill: { amountPaid?: number; creditApplied?: number }) {
  return Number(((bill.amountPaid ?? 0) + (bill.creditApplied ?? 0)).toFixed(2));
}

function billStatusFromReceived(grandTotal: number, received: number): 'paid' | 'partial' | 'due' {
  if (received >= grandTotal - 0.001) return 'paid';
  if (received > 0) return 'partial';
  return 'due';
}

function buildBillPdfData(
  bill: {
    billNo: string;
    subtotal: number;
    discount: number;
    miscAmount?: number;
    miscRemark?: string;
    grandTotal: number;
    items: Array<{
      productName: string;
      colorCode?: string;
      qty: number;
      rate: number;
      total: number;
    }>;
  },
  shop: Awaited<ReturnType<typeof getShopBillingIdentity>>,
  customer: { name?: string; phone?: string; address?: string },
  issuedAt: string,
  pay: ReturnType<typeof billPdfFields>
): PdfBillData {
  return {
    billNo: bill.billNo,
    firmName: shop.firmName,
    billedByName: shop.billedByName,
    billedByEmail: shop.billedByEmail,
    billedByAddress: shop.billedByAddress,
    customerName: customer.name ?? 'Customer',
    customerPhone: customer.phone,
    customerAddress: customer.address,
    items: bill.items.map((i) => {
      const pack = i.productName.match(/\(([^)]+)\)\s*$/)?.[1];
      const parts = [
        pack ? `Pack ${pack}` : '',
        i.colorCode ? `Color ${i.colorCode}` : '',
      ].filter(Boolean);
      return {
        name: i.productName,
        qty: i.qty,
        rate: i.rate,
        total: i.total,
        subtitle: parts.length ? parts.join(' · ') : undefined,
      };
    }),
    subtotal: bill.subtotal,
    discount: bill.discount,
    miscAmount: bill.miscAmount ?? 0,
    miscRemark: bill.miscRemark || undefined,
    grandTotal: bill.grandTotal,
    date: issuedAt,
    dueDate: issuedAt,
    status: pay.status,
    orderRef: bill.billNo,
    soldBy: shop.soldBy,
    delivery: 'Store pickup',
    amountPaid: pay.amountPaid,
    creditApplied: pay.creditApplied,
    received: pay.received,
    balanceDue: pay.balanceDue,
  };
}

function billPdfFields(bill: {
  grandTotal: number;
  amountPaid?: number;
  creditApplied?: number;
  status?: 'paid' | 'partial' | 'due';
}) {
  const amountPaid = bill.amountPaid ?? 0;
  const creditApplied = bill.creditApplied ?? 0;
  const received = billReceived(bill);
  return {
    amountPaid,
    creditApplied,
    received,
    balanceDue: Math.max(0, Number((bill.grandTotal - received).toFixed(2))),
    status: bill.status ?? billStatusFromReceived(bill.grandTotal, received),
  };
}

export async function createBill(tenantId: Types.ObjectId, input: CreateBillInput) {
  const customer = await accountsService.upsertCustomer(tenantId, input.customer);

  let subtotal = 0;
  const billItems = [];

  for (const item of input.items) {
    if (!Number.isFinite(item.qty) || item.qty < 1) {
      throw new AppError('Quantity must be at least 1 for every bill item', 400);
    }
    const product = await inventoryService.deductStock(
      tenantId,
      item.productId,
      item.qty,
      item.size
    );
    const rate = item.rate;
    if (!rate || rate <= 0) {
      throw new AppError('Unit rate is required for every bill item', 400);
    }
    const total = rate * item.qty;
    subtotal += total;
    const baseName = String((product as { name?: string }).name ?? '');
    const productName = item.size ? `${baseName} (${item.size})` : baseName;
    const colorCode = item.colorCode?.trim() || '';

    billItems.push({
      productId: new Types.ObjectId(String((product as { _id?: unknown })._id)),
      productName,
      qty: item.qty,
      rate,
      total,
      colorCode,
    });
  }

  const discount = input.discount ?? 0;
  const miscAmount = input.miscAmount ?? 0;
  const miscRemark = miscAmount > 0 ? (input.miscRemark ?? '').trim() : '';
  if (miscAmount > 0 && !miscRemark) {
    throw new AppError('Remark is required when miscellaneous amount is added', 400);
  }
  const grandTotal = Math.max(0, subtotal - discount + miscAmount);

  const requestedAmount = Math.max(0, input.amountPaid ?? 0);
  const paymentMode = (input.paymentMode ?? 'cash').toLowerCase();
  const payWithStoreCredit =
    paymentMode === 'store_credit' || paymentMode === 'credit' || paymentMode === 'store-credit';

  const bill = await BillModel.create({
    tenantId,
    billNo: generateBillNo(),
    customerId: customer._id,
    items: billItems,
    subtotal,
    discount,
    miscAmount,
    miscRemark,
    grandTotal,
    amountPaid: 0,
    creditApplied: 0,
    paymentMode: payWithStoreCredit ? 'store_credit' : paymentMode,
    status: 'due',
  });

  await accountsService.addBillToAccount(
    tenantId,
    customer._id as Types.ObjectId,
    bill._id as Types.ObjectId,
    grandTotal
  );

  let creditApplied = 0;
  let amountPaid = 0;

  if (payWithStoreCredit) {
    const creditToApply = Math.min(requestedAmount || grandTotal, grandTotal);
    creditApplied = await accountsService.applyCustomerCredit(
      tenantId,
      customer._id as Types.ObjectId,
      creditToApply
    );
  } else {
    amountPaid = Math.min(requestedAmount, grandTotal);
    if (amountPaid > 0) {
      await accountsService.addPaymentToAccount(
        tenantId,
        customer._id as Types.ObjectId,
        bill._id as Types.ObjectId,
        amountPaid
      );
    }
    // Auto-debit store credit against whatever is still pending (partial allowed).
    const remaining = Number((grandTotal - amountPaid).toFixed(2));
    if (remaining > 0) {
      creditApplied = await accountsService.applyCustomerCredit(
        tenantId,
        customer._id as Types.ObjectId,
        remaining
      );
    }
  }

  const received = Number((creditApplied + amountPaid).toFixed(2));
  bill.amountPaid = amountPaid;
  bill.creditApplied = creditApplied;
  bill.status = billStatusFromReceived(grandTotal, received);
  await bill.save();

  const customerDoc = await CustomerModel.findById(customer._id);
  const shop = await getShopBillingIdentity(tenantId);
  const issuedAt = new Date().toISOString();
  const pay = billPdfFields(bill);
  const pdfData = buildBillPdfData(
    bill,
    shop,
    {
      name: customerDoc?.name ?? input.customer.name,
      phone: input.customer.phone ?? customerDoc?.phone ?? undefined,
      address: input.customer.address ?? customerDoc?.address ?? undefined,
    },
    issuedAt,
    pay
  );

  const pdfKey = buildPdfKey(String(tenantId), 'bill', bill.billNo);
  bill.pdfUrl = pdfKey;
  await bill.save();
  await queueBillPdfJob(String(tenantId), String(bill._id), bill.billNo, pdfData, pdfKey);

  return { bill, cashMemo: null, pdfBuffer: null, creditApplied };
}

export async function listBillingProducts(
  tenantId: Types.ObjectId,
  query: {
    page?: number;
    limit?: number;
    search?: string;
    brandId?: string;
    type?: string;
  }
) {
  return inventoryService.listProductsPaginated(tenantId, query);
}

export async function listBills(tenantId: Types.ObjectId) {
  return BillModel.find({ tenantId })
    .populate('customerId', 'name phone')
    .sort({ createdAt: -1 });
}

export async function getBill(tenantId: Types.ObjectId, billId: string) {
  const bill = await BillModel.findOne({ _id: billId, tenantId }).populate(
    'customerId',
    'name phone address gstin'
  );
  if (!bill) throw new AppError('Bill not found', 404);
  return bill;
}

export async function getBillPdf(
  tenantId: Types.ObjectId,
  billId: string,
  format: 'standard' | 'dl' = 'standard'
) {
  const bill = await getBill(tenantId, billId);
  const customer = bill.customerId as {
    name?: string;
    address?: string;
    phone?: string;
  } | null;
  const shop = await getShopBillingIdentity(tenantId);
  const createdAt =
    (bill as { createdAt?: Date }).createdAt?.toISOString?.() ?? new Date().toISOString();
  const pay = billPdfFields(bill);
  const pdfData = buildBillPdfData(bill, shop, customer ?? {}, createdAt, pay);

  return resolveBillPdf(
    String(tenantId),
    String(bill._id),
    bill.billNo,
    pdfData,
    bill.pdfUrl,
    format
  );
}

export async function recordBillPayment(
  tenantId: Types.ObjectId,
  billId: string,
  input: RecordBillPaymentInput
) {
  const bill = await BillModel.findOne({ _id: billId, tenantId });
  if (!bill) throw new AppError('Bill not found', 404);

  const alreadyReceived = billReceived(bill);
  const remaining = Math.max(0, Number((bill.grandTotal - alreadyReceived).toFixed(2)));
  if (input.amountPaid > remaining + 0.001) {
    throw new AppError(
      `Amount exceeds balance due (₹${remaining.toFixed(2)}) for invoice ${bill.billNo}`,
      400
    );
  }

  bill.amountPaid = Number(((bill.amountPaid ?? 0) + input.amountPaid).toFixed(2));
  if (input.paymentMode) bill.paymentMode = input.paymentMode;
  bill.status = billStatusFromReceived(bill.grandTotal, billReceived(bill));
  await bill.save();

  await accountsService.addPaymentToAccount(
    tenantId,
    bill.customerId as Types.ObjectId,
    bill._id as Types.ObjectId,
    input.amountPaid
  );

  // Any available store credit chips away at what is still pending.
  await accountsService.autoSettlePendingBillsWithCredit(
    tenantId,
    bill.customerId as Types.ObjectId
  );

  await getBillPdf(tenantId, String(bill._id));
  return getBill(tenantId, String(bill._id));
}
