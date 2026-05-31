import { Types } from 'mongoose';
import { AppError } from '../../utils/appError.js';
import { generateBillNo } from '../../utils/invoice.number.js';
import { generateBillPdf } from '../../utils/pdf.generator.js';
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
    const product = await inventoryService.deductStock(tenantId, item.productId, item.qty);
    const rate = item.rate ?? product.salePrice ?? 0;
    const total = rate * item.qty;
    subtotal += total;

    billItems.push({
      productId: new Types.ObjectId(String((product as { _id?: unknown })._id)),
      productName: String((product as { name?: string }).name ?? ''),
      qty: item.qty,
      rate,
      total,
    });
  }

  const discount = input.discount ?? 0;
  const grandTotal = Math.max(0, subtotal - discount);
  const amountPaid = input.amountPaid ?? 0;

  let status: 'paid' | 'partial' | 'due' = 'due';
  if (amountPaid >= grandTotal) status = 'paid';
  else if (amountPaid > 0) status = 'partial';

  const bill = await BillModel.create({
    tenantId,
    billNo: generateBillNo(),
    customerId: customer._id,
    items: billItems,
    subtotal,
    discount,
    grandTotal,
    status,
  });

  await accountsService.addBillToAccount(
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

  const customerDoc = await CustomerModel.findById(customer._id);
  const pdfBuffer = await generateBillPdf({
    billNo: bill.billNo,
    customerName: customerDoc?.name ?? input.customer.name,
    items: billItems.map((i) => ({
      name: i.productName,
      qty: i.qty,
      rate: i.rate,
      total: i.total,
    })),
    subtotal,
    discount,
    grandTotal,
    date: new Date().toISOString(),
  });

  return { bill, cashMemo, pdfBuffer };
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
