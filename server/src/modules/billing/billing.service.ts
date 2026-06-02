import { Types } from 'mongoose';
import { AppError } from '../../utils/appError.js';
import { generateBillNo } from '../../utils/invoice.number.js';
import { generateBillPdf } from '../../utils/pdf.generator.js';
import { buildPdfKey, readPdfByKey, savePdfByKey } from '../../utils/pdf.storage.js';
import * as accountsService from '../accounts/accounts.service.js';
import { CustomerModel } from '../accounts/customer.model.js';
import * as cashmemoService from '../cashmemo/cashmemo.service.js';
import * as inventoryService from '../inventory/inventory.service.js';
import { BillModel } from './billing.model.js';
import type { CreateBillInput } from './billing.validator.js';

export async function createBill(tenantId: Types.ObjectId, input: CreateBillInput) {
  const customer = await accountsService.upsertCustomer(tenantId, input.customer);

  let subtotal = 0;
  const billItems = [];

  for (const item of input.items) {
    const product = await inventoryService.deductStock(
      tenantId,
      item.productId,
      item.qty,
      item.size
    );
    const rate = item.rate ?? product.salePrice ?? 0;
    const total = rate * item.qty;
    subtotal += total;
    const baseName = String((product as { name?: string }).name ?? '');
    const productName = item.size ? `${baseName} (${item.size})` : baseName;

    billItems.push({
      productId: new Types.ObjectId(String((product as { _id?: unknown })._id)),
      productName,
      qty: item.qty,
      rate,
      total,
    });
  }

  const discount = input.discount ?? 0;
  const grandTotal = Math.max(0, subtotal - discount);

  const amountPaid = input.amountPaid ?? 0;

  const bill = await BillModel.create({
    tenantId,
    billNo: generateBillNo(),
    customerId: customer._id,
    items: billItems,
    subtotal,
    discount,
    grandTotal,
    status: 'due',
  });

  const { creditApplied } = await accountsService.addBillToAccount(
    tenantId,
    customer._id as Types.ObjectId,
    bill._id as Types.ObjectId,
    grandTotal
  );

  let cashMemo = null;
  if (amountPaid > 0) {
    cashMemo = await cashmemoService.createCashMemo(tenantId, {
      billId: (bill._id as Types.ObjectId).toString(),
      customerId: (customer._id as Types.ObjectId).toString(),
      amountPaid,
      paymentMode: input.paymentMode ?? 'cash',
    });
  }

  const totalSettled = creditApplied + amountPaid;
  if (totalSettled >= grandTotal) bill.status = 'paid';
  else if (totalSettled > 0) bill.status = 'partial';
  else bill.status = 'due';
  await bill.save();

  const customerDoc = await CustomerModel.findById(customer._id);
  const gstRate = 18;
  const gstAmount = 0;
  const pdfBuffer = await generateBillPdf({
    billNo: bill.billNo,
    firmName: 'paintapp',
    billedByName: 'paintapp',
    billedByEmail: 'hello@asthetcss.com',
    billedByAddress: 'Business Address',
    customerName: customerDoc?.name ?? input.customer.name,
    customerEmail: undefined,
    customerAddress: input.customer.address ?? customerDoc?.address ?? undefined,
    items: billItems.map((i) => ({
      name: i.productName,
      qty: i.qty,
      rate: i.rate,
      total: i.total,
    })),
    subtotal,
    gstRate,
    gstAmount,
    discount,
    grandTotal,
    date: new Date().toISOString(),
    dueDate: new Date().toISOString(),
  });

  const pdfKey = buildPdfKey(String(tenantId), 'bill', bill.billNo);
  await savePdfByKey(pdfKey, pdfBuffer);
  bill.pdfUrl = pdfKey;
  await bill.save();

  return { bill, cashMemo, pdfBuffer, creditApplied };
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

export async function getBillPdf(tenantId: Types.ObjectId, billId: string) {
  const bill = await getBill(tenantId, billId);
  if (bill.pdfUrl) {
    const cached = await readPdfByKey(bill.pdfUrl);
    if (cached) return cached;
  }

  const customer = bill.customerId as { name?: string; address?: string } | null;
  const gstRate = 18;
  const gstAmount = 0;
  const createdAtIso = new Date().toISOString();
  const buffer = await generateBillPdf({
    billNo: bill.billNo,
    firmName: 'paintapp',
    billedByName: 'paintapp',
    billedByEmail: 'hello@asthetcss.com',
    billedByAddress: 'Business Address',
    customerName: customer?.name ?? 'Customer',
    customerAddress: customer?.address,
    items: bill.items.map((i) => ({
      name: i.productName,
      qty: i.qty,
      rate: i.rate,
      total: i.total,
    })),
    subtotal: bill.subtotal,
    gstRate,
    gstAmount,
    discount: bill.discount,
    grandTotal: bill.grandTotal,
    date: createdAtIso,
    dueDate: createdAtIso,
  });

  const key = bill.pdfUrl ?? buildPdfKey(String(tenantId), 'bill', bill.billNo);
  await savePdfByKey(key, buffer);
  if (!bill.pdfUrl) {
    bill.pdfUrl = key;
    await bill.save();
  }
  return buffer;
}
